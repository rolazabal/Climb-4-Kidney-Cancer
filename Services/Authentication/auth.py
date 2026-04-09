import os
import asyncio
import httpx
import redis.asyncio as redis
import uuid
import json
import secrets
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel, EmailStr

# -----------------
# ENV + CONFIG
# -----------------

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

USERS_SERVICE_URL = "http://users-service:8000"

# -----------------
# MODELS
# -----------------

class RequestLogin(BaseModel):
    email: EmailStr
    
class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class VerifyLogin(BaseModel):
    email: EmailStr
    code: str


# -----------------
# JWT FUNCTIONS
# -----------------

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token():
    return {
        "jti": str(uuid.uuid4()), # unique id
        "sid": str(uuid.uuid4()) # session id
    }

# encodes refresh tokens like JWT
def encode_refresh_token(jti, sid, user_id):
    payload = {
        "jti": jti,
        "sid": sid,
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    
# For one time passwords
def generate_otp():
    return str(secrets.randbelow(900000) + 100000)

# -----------------
# LIFESPAN
# -----------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True
    )
    
    # Wait until Redis is ready
    for _ in range(10):
        try:
            await redis_client.ping()
            print("Connected to Redis")
            break
        except Exception:
            print("Waiting for Redis...")
            await asyncio.sleep(1)
    else:
        raise Exception("Could not connect to Redis")
    
    app.state.redis = redis_client            
    
    yield
    
    await redis_client.close()


app = FastAPI(lifespan=lifespan)


# -----------------
# USERS SERVICE CALL & SESSION REVOCATION
# -----------------

async def get_user_by_email(email: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{USERS_SERVICE_URL}/users/by-email/{email}")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Users service timed out")
        except Exception:
            raise HTTPException(status_code=500, detail="Users service unreachable")

        if response.status_code != 200:
            return None

        return response.json()
    
    
async def revoke_session(redis_client, sid: str):
    session_key = f"auth:session:{sid}"
    
    jtis = await redis_client.smembers(session_key)
    
    for jti in jtis:
        await redis_client.delete(f"auth:refresh:{jti}")
        
    await redis_client.delete(session_key)


# -----------------
# ROUTES
# -----------------

@app.post("/request-login")
async def request_login(payload: RequestLogin):
    redis_client = app.state.redis
    
    # Rate limit (1 request for OTP per 60 seconds)
    otp_key = f"auth:otp:{payload.email}"
    rate_limit_key = f"auth:otp_req:{payload.email}"
    
    was_set = await redis_client.set(
        rate_limit_key,
        "1",
        ex=60, # 60 seconds per request
        nx=True # only send if no key exists
    )
    
    if not was_set:
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another OTP"
        )
        
    existing = await redis_client.get(otp_key)
    
    if existing:
        raise HTTPException(
            status_code=429,
            detail="OTP already sent. Please wait."
        )
    
    user = await get_user_by_email(payload.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = generate_otp()
    
    
    await redis_client.set(
        f"auth:otp:{payload.email}",
        code,
        ex=300   # 5 minute expiration
    )
    

    # TODO: replace with real email sending
    print(f"OTP for {payload.email}: {code}")

    return {"message": "OTP sent"}


@app.post("/verify-login")
async def verify_login(payload: VerifyLogin):
    redis_client = app.state.redis
    
    otp_key = f"auth:otp:{payload.email}"
    attempts_key = f"auth:otp_attempts:{payload.email}"
    
    stored_code = await redis_client.get(otp_key)
    
    if not stored_code:
        attempts = await redis_client.incr(attempts_key)
        if attempts == 1:
            await redis_client.expire(attempts_key, 300)
        raise HTTPException(status_code=401, detail="OTP expired or not found")
    
    attempts = await redis_client.incr(attempts_key)
    
    # Expiration set on first attempt
    if attempts == 1:
        await redis_client.expire(attempts_key, 300)
      
    # too many attempts error  
    if attempts > 5:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Try again later."
        )
    
    if stored_code != payload.code:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Cleanup keys after success
    await redis_client.delete(otp_key)
    await redis_client.delete(attempts_key)

    user = await get_user_by_email(payload.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token({
        "sub": user["uuid"],
        "email": user["email"],
        "role": user["role"]
    })
    
    refresh = create_refresh_token()
    
    refresh_key = f"auth:refresh:{refresh['jti']}"
    
    await redis_client.set(
        refresh_key,
        json.dumps({
            "user_id": user["uuid"],
            "sid": refresh["sid"],
            "email": user["email"],
            "role": user["role"]
        }),
        ex = 60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS
    )
    
    # session tracking
    await redis_client.sadd(f"auth:session:{refresh['sid']}", refresh["jti"])
    await redis_client.expire(f"auth:session:{refresh['sid']}", 60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS)
    
    refresh_token = encode_refresh_token(
        refresh["jti"],
        refresh["sid"],
        user["uuid"]
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    
    
@app.post("/refresh")
async def refresh_token(payload: RefreshRequest):
    redis_client = app.state.redis
    
    try:
        decoded = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    jti = decoded["jti"]
    sid = decoded["sid"]
    user_id = decoded["sub"]
    
    refresh_key = f"auth:refresh:{jti}"
    stored = await redis_client.get(refresh_key)
    
    if not stored:
        await revoke_session(redis_client, sid)
        raise HTTPException(status_code=401, detail="Token reuse detected")
    
    stored_data = json.loads(stored)
    
    if stored_data["sid"] != sid:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    email = stored_data.get("email")
    role = stored_data.get("role", "user")
    
    # Rotate out old refresh token
    await redis_client.delete(refresh_key)
    
    new_refresh = create_refresh_token()
    new_key = f"auth:refresh:{new_refresh['jti']}"
    
    await redis_client.set(
        new_key,
        json.dumps({
            "user_id": user_id,
            "sid": sid,
            "email": email
        }),
        ex=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS
    )
    
    await redis_client.sadd(f"auth:session:{sid}", new_refresh["jti"])
    await redis_client.expire(f"auth:session:{sid}", 60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS)
    
    # issue new access token
    new_access_token = create_access_token({
        "sub": user_id,
        "email": email,
        "role": role
    })
    
    new_refresh_token = encode_refresh_token(
        new_refresh["jti"],
        sid,
        user_id
    )
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token
    }
    
    
@app.post("/logout")
async def logout(payload: LogoutRequest):
    redis_client = app.state.redis
    
    try:
        decoded = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    jti = decoded["jti"]
    sid = decoded["sid"]
    
    await redis_client.delete(f"auth:refresh:{jti}")
    await revoke_session(redis_client, sid)
    
    return {"message": "Logged out successfully!"}

# Useful for debugging JWTs
@app.post("/verify-token")
async def verify_jwt(token: str):
    payload = verify_token(token)
    return {"sub": payload.get("sub"), "email": payload.get("email")}

@app.get("/health")
async def health():
    redis_client = app.state.redis
    try:
        await redis_client.ping()
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Redis unavailable")