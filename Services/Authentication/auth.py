import os
import httpx
import random
import time
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel

# -----------------
# ENV + CONFIG
# -----------------

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

USERS_SERVICE_URL = "http://users-service:8000"

# -----------------
# MODELS
# -----------------

class RequestLogin(BaseModel):
    email: str


class VerifyLogin(BaseModel):
    email: str
    code: str


# -----------------
# JWT FUNCTIONS
# -----------------

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# -----------------
# OTP STORAGE (TEMP)
# -----------------

otp_store = {}


def generate_otp():
    return str(random.randint(100000, 999999))


# -----------------
# LIFESPAN
# -----------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(lifespan=lifespan)


# -----------------
# USERS SERVICE CALL
# -----------------

async def get_user_by_email(email: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{USERS_SERVICE_URL}/users/by-email/{email}")
        except Exception:
            raise HTTPException(status_code=500, detail="Users service unreachable")

        if response.status_code != 200:
            return None

        return response.json()


# -----------------
# ROUTES
# -----------------

@app.post("/request-login")
async def request_login(payload: RequestLogin):
    user = await get_user_by_email(payload.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = generate_otp()

    otp_store[payload.email] = {
        "code": code,
        "expires": time.time() + 300  # 5 minutes
    }

    # TODO: replace with real email sending
    print(f"OTP for {payload.email}: {code}")

    return {"message": "OTP sent"}


@app.post("/verify-login")
async def verify_login(payload: VerifyLogin):
    record = otp_store.get(payload.email)

    if not record:
        raise HTTPException(status_code=401, detail="No OTP found")

    if time.time() > record["expires"]:
        raise HTTPException(status_code=401, detail="OTP expired")

    if record["code"] != payload.code:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # fetch user again (optional but safer)
    user = await get_user_by_email(payload.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token({
        "sub": user["uuid"],   # IMPORTANT: use UUID, not email
        "email": user["email"]
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }