## IMPORTS
import random as rnd

import boto3
import os
import asyncpg
import uuid
import httpx
from datetime import date, datetime, timedelta, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from jose import jwt, JWTError
from pydantic import BaseModel,EmailStr
import hashlib

S3_BUCKET = os.getenv("S3_BUCKET", "summitstepimages")
S3_REGION = os.getenv("S3_REGION", "us-east-2")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")
SES_FROM_EMAIL = os.getenv("SES_FROM_EMAIL", "chan202220@gmail.com")

s3 = boto3.client("s3", region_name=S3_REGION)
ses = boto3.client("sesv2", region_name=AWS_REGION)

USER_PREFIX = "UserImages/"


# Security
security = HTTPBearer()

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload 
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def require_admin(current_user = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


# SCHEMA
class User(BaseModel):
    email: EmailStr
    username: str
    dob: date | None = None
    bio: str | None = None
    profile_photo_media_id: str | None = None
    # role is intentionally excluded — always set to "user" on creation.
    # Use the admin-only PATCH /users/{user_id}/role endpoint to promote users.

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be at most 30 characters")
        if not v.replace("_", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return v


    @field_validator("bio")
    @classmethod
    def bio_valid(cls, v):
        if v and len(v) > 300:
            raise ValueError("Bio must be at most 300 characters")
        return v

class UserPatch(BaseModel):
    email: str | None = None
    username: str | None = None
    dob: date | None = None
    bio: str | None = None
    profile_photo_media_id: str | None = None

class UserRolePatch(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def role_valid(cls, v):
        allowed = {"user", "admin"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {allowed}")
        return v

class UserSettings(BaseModel):
    user_id: uuid.UUID
    notification_on: bool

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


# --------------------
# DB Functions (CRUD)
# --------------------

def presigned_get_url(key: str, expires_seconds: int = 3600) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )

def to_user_key(filename_or_key: str) -> str:
    # If DB already contains a full key, keep it
    if filename_or_key.startswith(USER_PREFIX):
        return filename_or_key
    return USER_PREFIX + filename_or_key

async def create_user(conn, email, username, dob, bio=None, profile_photo_media_id=None, role="user"):
    row = await conn.fetchrow('''
        INSERT INTO users(email, username, dob, bio, profile_photo_media_id, role) 
        VALUES($1, $2, $3, $4, $5, $6) 
        RETURNING uuid
    ''', email, username, dob, bio, profile_photo_media_id, role)
    
    user_id = row["uuid"]

    # create default settings row
    await conn.execute('''
        INSERT INTO user_settings(user_id, notification_on)
        VALUES($1, true)
    ''', user_id)

    return str(user_id)

async def update_user(conn, user_id: str, email=None, username=None, dob=None, bio=None, profile_photo_media_id=None):
    element_updates = {}
    if email is not None:
        element_updates["email"] = email
    if username is not None:
        element_updates["username"] = username
    if dob is not None:
        element_updates["dob"] = dob
    if bio is not None:
        element_updates["bio"] = bio
    if profile_photo_media_id is not None:
        element_updates["profile_photo_media_id"] = profile_photo_media_id
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE users SET {set_clause} WHERE uuid = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [user_id]
    return await conn.execute(query, *values)

async def delete_user_db(conn, user_id: str):
    return await conn.execute('''
        DELETE FROM users WHERE uuid = $1
    ''', user_id)

async def read_user(conn, user_id: str):
    return await conn.fetchrow('''
        SELECT * FROM users WHERE uuid = $1
    ''', user_id)

async def read_user_by_name(conn, username: str):
    return await conn.fetchrow('''
        SELECT * FROM users WHERE username = $1
    ''', username)

async def list_users(conn):
    return await conn.fetch('''
        SELECT * FROM users
    ''')

async def toggle_notification(conn, user_id: uuid.UUID, notification_on: bool):
    return await conn.execute(
        "UPDATE user_settings SET notification_on = $2 WHERE user_id=$1",
        user_id, notification_on
    )

# --------------
# LIFESPAN 
# --------------

DBurl = os.getenv("DATABASE_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl)
    async with app.state.pool.acquire() as conn:

        # enable UUID generation
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users(
                uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                email varchar(255) NOT NULL UNIQUE,
                username varchar NOT NULL UNIQUE,
                dob DATE,
                bio TEXT,
                profile_photo_media_id varchar(255),
                email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                role TEXT NOT NULL DEFAULT 'user'
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_settings(
                    user_id uuid PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
                    notification_on boolean NOT NULL DEFAULT true
                )
        """)

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS email_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            attempts INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)

        # Seed initial admin from environment variable
        initial_admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
        if initial_admin_email:
            updated = await conn.execute(
                "UPDATE users SET role = 'admin' WHERE email = $1 AND role != 'admin'",
                initial_admin_email
            )
            if updated.endswith("0"):
                print(f"[seed] No user found with email '{initial_admin_email}' — skipping admin seed.")
            else:
                print(f"[seed] '{initial_admin_email}' promoted to admin.")

    yield

    # shutdown
    await app.state.pool.close()

def generate_verification_code() -> str:
    return f"{rnd.randint(0, 999999):06d}"

def hash_verification_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

def send_verification_email(to_email: str, code: str) -> None:
    ses.send_email(
        FromEmailAddress=SES_FROM_EMAIL,
        Destination={"ToAddresses": [to_email]},
        Content={
            "Simple": {
                "Subject": {
                    "Data": "Your verification code",
                    "Charset": "UTF-8"
                },
                "Body": {
                    "Text": {
                        "Data": f"Your verification code is {code}. It expires in 10 minutes.",
                        "Charset": "UTF-8"
                    },
                    "Html": {
                        "Data": f"""
                        <html>
                          <body>
                            <h2>Email Verification</h2>
                            <p>Your verification code is:</p>
                            <p style="font-size:24px;font-weight:bold;">{code}</p>
                            <p>This code expires in 10 minutes.</p>
                          </body>
                        </html>
                        """,
                        "Charset": "UTF-8"
                    }
                }
            }
        }
    )

app = FastAPI(lifespan=lifespan)
router = APIRouter()




# ----------
# ROUTES
# ----------

@router.post("/")
async def add_user(users: User):
    async with app.state.pool.acquire() as conn:
        new_id = await create_user(
            conn,
            users.email,
            users.username,
            users.dob,
            users.bio,
            users.profile_photo_media_id,
            role="user"  # always force "user" — role cannot be set by the client
        )

    return {"id": new_id}

# get user by id
@router.get("/id/{user_id}")
async def get_user(user_id: uuid.UUID, current_user: str = Depends(get_current_user)):

    async with app.state.pool.acquire() as conn:
        result = await read_user(conn, user_id)

    if not result:
        raise HTTPException(404, "User not found")

    return dict(result)

# get user by name
@router.get("/username/{username}")
async def get_user_by_name(username: str, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await read_user_by_name(conn, username)

    if not result:
        raise HTTPException(404, "User not found")

    return dict(result)


# delete user entry
@router.delete("/{user_id}")
async def delete_user(user_id: uuid.UUID, current_user: dict = Depends(require_admin)):
    async with app.state.pool.acquire() as conn:
        result = await delete_user_db(conn, user_id)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "User deleted"}

# update user entry
@router.patch("/{user_id}")
async def patch_user(user_id: uuid.UUID, patch: UserPatch, current_user: dict = Depends(get_current_user)):
    # Only the user themselves or an admin may update a profile
    if current_user.get("role") != "admin" and current_user.get("sub") != str(user_id):
        raise HTTPException(status_code=403, detail="You can only update your own profile")

    data = patch.model_dump(exclude_unset=True, exclude_none=True)
    if "url" in data:
        data["image_url"] = data.pop("url")

    async with app.state.pool.acquire() as conn:
        result = await update_user(conn, user_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

# update user role (admin only)
@router.patch("/{user_id}/role")
async def update_user_role(user_id: uuid.UUID, body: UserRolePatch, current_user: dict = Depends(require_admin)):
    async with app.state.pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE users SET role = $1 WHERE uuid = $2",
            body.role, user_id
        )
    if result.endswith("0"):
        raise HTTPException(404, "User not found")
    return {"message": f"User role updated to '{body.role}'"}

# get all users
@router.get("/")
async def get_users(current_user: dict = Depends(require_admin)):
    async with app.state.pool.acquire() as conn:
        result = await list_users(conn)

    if not result:
        raise HTTPException(404, "No users found")

    return [dict(record) for record in result]  

# toggle notification setting
@router.put("/user_settings/{user_id}")
async def toggle(user_id: uuid.UUID, notification_on: bool = Body(...), current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await toggle_notification(conn, user_id, notification_on)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "Notification setting updated"}

@router.get("/{user_id}/profile_photo_media_id")
async def get_user_image_url(user_id: str, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT profile_photo_media_id FROM users WHERE uuid=$1::uuid",
            user_id
        )
    if not row or not row["profile_photo_media_id"]:
        raise HTTPException(404, "Image not found")

    # DB stores filename like "user123photo.jpg"
    key = to_user_key(row["profile_photo_media_id"])  # -> "UserImages/user123photo.jpg"
    return {"url": presigned_get_url(key)}


@router.get("/by-email/{email}")
async def get_user_by_email(email: str):
    async with app.state.pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            email
        )

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return dict(user)

app.include_router(router, prefix="/users", tags=["users"])


@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
@app.post("/auth/request-verification")
async def request_verification(req: EmailRequest):
    code = generate_verification_code()
    code_hash = hash_verification_code(code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    async with app.state.pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO email_verifications (email, code_hash, expires_at, used, attempts)
            VALUES ($1, $2, $3, FALSE, 0)
            """,
            req.email,
            code_hash,
            expires_at
        )

    try:
        send_verification_email(req.email, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "Verification email sent"}


@app.post("/auth/verify-email")
async def verify_email(req: VerifyEmailRequest):
    async with app.state.pool.acquire() as conn:
        record = await conn.fetchrow(
            """
            SELECT id, code_hash, expires_at, used, attempts
            FROM email_verifications
            WHERE email = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            req.email
        )

        if not record:
            raise HTTPException(status_code=400, detail="No verification request found")

        if record["used"]:
            raise HTTPException(status_code=400, detail="Code already used")

        if datetime.now(timezone.utc) > record["expires_at"]:
            raise HTTPException(status_code=400, detail="Code expired")

        if record["attempts"] >= 5:
            raise HTTPException(status_code=400, detail="Too many attempts")

        if hash_verification_code(req.code) != record["code_hash"]:
            await conn.execute(
                """
                UPDATE email_verifications
                SET attempts = attempts + 1
                WHERE id = $1
                """,
                record["id"]
            )
            raise HTTPException(status_code=400, detail="Invalid code")

        await conn.execute(
            """
            UPDATE email_verifications
            SET used = TRUE
            WHERE id = $1
            """,
            record["id"]
        )

        await conn.execute(
            """
            UPDATE users
            SET email_verified = TRUE
            WHERE email = $1
            """,
            req.email
        )

    return {"message": "Email verified successfully"}