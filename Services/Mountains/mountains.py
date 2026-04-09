# IMPORTS
import boto3
import os

S3_BUCKET = os.getenv("S3_BUCKET", "summitstepimages")
S3_REGION = os.getenv("S3_REGION", "us-east-2")

s3 = boto3.client("s3", region_name=S3_REGION)

MOUNTAIN_PREFIX = "MountainsImages/"

# type "fastapi dev mountains.py" in console to run
import os
import asyncpg
import asyncio
import uuid
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Body
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
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    
# SCHEMA
class Mountain(BaseModel):
    name: str
    height: float
    location: str
    description: str | None = None
    url: str | None = None

class MountainPatch(BaseModel):
    name: str | None = None
    height: float | None = None
    location: str | None = None
    description: str | None = None
    url: str | None = None



# --------------------
# DB Functions (CRUD)
# --------------------


def presigned_get_url(key: str, expires_seconds: int = 3600) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )

def to_mountain_key(filename_or_key: str) -> str:
    # If DB already contains a full key, keep it
    if filename_or_key.startswith(MOUNTAIN_PREFIX):
        return filename_or_key
    return MOUNTAIN_PREFIX + filename_or_key

async def create_mountain(conn, name, height, location, description=None, image_url=None):
    row = await conn.fetchrow('''
        INSERT INTO mountains(name, height, location, description, image_url)
        VALUES($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
        RETURNING uuid
    ''', name, height, location, description, image_url)

    if row is None:
        return None

    return str(row["uuid"])


async def update_mountain(conn, mountain_uuid: str, name=None, height=None, location=None, description=None, image_url=None):
    element_updates = {}
    if name is not None:
        element_updates["name"] = name
    if height is not None:
        element_updates["height"] = height
    if location is not None:
        element_updates["location"] = location
    if description is not None:
        element_updates["description"] = description
    if image_url is not None:
        element_updates["image_url"] = image_url
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE mountains SET {set_clause} WHERE uuid = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [mountain_uuid]
    return await conn.execute(query, *values)


# "DELETE 1" or "DELETE 0"
async def delete_mountain(conn, mountain_id: str):
    row = await conn.execute(
        "DELETE FROM mountains WHERE uuid=$1",
        mountain_id
    )
    return row


async def read_mountain(conn, mountain_id: str):
    row = await conn.fetchrow(
        "SELECT * FROM mountains WHERE uuid=$1",
        mountain_id
    )
    return row


async def list_mountains(conn):
    rows = await conn.fetch("""
        SELECT * FROM mountains
    """)
    return [dict(row) for row in rows]


# --------------
# LIFESPAN 
# --------------
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DBurl = f"postgresql://{DB_USER}:{DB_PASSWORD}@mountains-db:5432/mountains_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl)

    async with app.state.pool.acquire() as conn:
        await conn.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS mountains(
                uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL UNIQUE,
                height real NOT NULL,
                location text NOT NULL,
                description text,
                image_url text
        );
    """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)


# ----------
# ROUTES
# ----------
@app.post("/mountains")
async def add_mountain(mountain: Mountain, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        new_id = await create_mountain(
            conn,
            mountain.name,
            mountain.height,
            mountain.location,
            mountain.description,
            mountain.url
        )

    if new_id is None:
        return {"message": "Mountain already exists"}

    return {"id": new_id}

# get mountain by id
@app.get("/mountains/{mountain_id}")
async def get_mountain(mountain_id: str):
    async with app.state.pool.acquire() as conn:
        result = await read_mountain(conn, mountain_id)

    if not result:
        raise HTTPException(404, "Mountain not found")

    return dict(result)

# Returns id, name of all mountains
@app.get("/mountains")
async def get_mountains():
    async with app.state.pool.acquire() as conn:
        mountains = await list_mountains(conn)
    return mountains

# delete mountain entry
@app.delete("/mountains/{mountain_id}")
async def remove_mountain(mountain_id: str, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await delete_mountain(conn, mountain_id)

    if result.endswith("0"):
        raise HTTPException(404, "Mountain not found")

    return {"message": "Mountain deleted"}

# update mountain entry
@app.patch("/mountains/{mountain_id}")
async def patch_mountain(mountain_id: str, patch: MountainPatch, current_user: str = Depends(get_current_user)):
    data = patch.model_dump(exclude_unset=True, exclude_none=True)

    if "url" in data:
        data["image_url"] = data.pop("url")

    async with app.state.pool.acquire() as conn:
        result = await update_mountain(conn, mountain_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "Mountain not found")

    return {"message": "Mountain updated"}

@app.get("/mountains/{mountain_id}/image-url")
async def get_mountain_image_url(mountain_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT image_url FROM mountains WHERE uuid=$1::uuid",
            mountain_id
        )
    if not row or not row["image_url"]:
        raise HTTPException(404, "Image not found")

    # DB stores filename like "EverestPhoto.jpg"
    key = to_mountain_key(row["image_url"])  # -> "MountainsImages/EverestPhoto.jpg"
    return {"url": presigned_get_url(key)}

@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")