## IMPORTS
import boto3
import os

S3_BUCKET = os.getenv("S3_BUCKET", "summitstepimages")
S3_REGION = os.getenv("S3_REGION", "us-east-2")

s3 = boto3.client("s3", region_name=S3_REGION)

USER_PREFIX = "UserImages/"

# type "fastapi dev users.py" in console to run

import os
import asyncpg
import asyncio
import uuid
import httpx
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

# Security
security = HTTPBearer()

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = "HS256"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token")


# SCHEMA
class User(BaseModel):
    email: str
    username: str
    dob: date | None = None
    bio: str | None = None
    profile_photo_media_id: str | None = None

class UserPatch(BaseModel):
    email: str | None = None
    username: str | None = None
    dob: date | None = None
    bio: str | None = None
    profile_photo_media_id: str | None = None

class UserSettings(BaseModel):
    user_id: uuid.UUID
    notification_on: bool


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

async def create_user(conn, email, username, dob, bio = None, profile_photo_media_id = None):
    row = await conn.fetchrow('''
        INSERT INTO users(email, username, dob, bio, profile_photo_media_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING uuid
    ''', email, username, dob, bio, profile_photo_media_id)

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

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DBurl = f"postgresql://{DB_USER}:{DB_PASSWORD}@users-db:5432/accounts_service"


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
                profile_photo_media_id varchar(255)
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_settings(
                    user_id uuid PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
                    notification_on boolean NOT NULL DEFAULT true
                )
        """)

    yield

    # shutdown
    await app.state.pool.close()


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
            users.profile_photo_media_id
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
async def delete_user(user_id: uuid.UUID, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await delete_user_db(conn, user_id)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "User deleted"}

# update user entry
@router.patch("/{user_id}")
async def patch_user(user_id: uuid.UUID, patch: UserPatch, current_user: str = Depends(get_current_user)):
    data = patch.model_dump(exclude_unset=True, exclude_none=True)
    if "url" in data:
        data["image_url"] = data.pop("url")

    async with app.state.pool.acquire() as conn:
        result = await update_user(conn, user_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

# get all users
@router.get("/")
async def get_users(current_user: str = Depends(get_current_user)):
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