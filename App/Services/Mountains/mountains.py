# IMPORTS
import boto3
import os

S3_BUCKET = os.getenv("S3_BUCKET", "summitstepimages")
S3_REGION = os.getenv("S3_REGION", "us-east-2")
MOUNTAINS_API_URL = "https://climb-4-kidney-cancer-production-fde3.up.railway.app/mountains/mountains"


s3 = boto3.client("s3", region_name=S3_REGION)

MOUNTAIN_PREFIX = "MountainsImages/"

# type "fastapi dev mountains.py" in console to run
import os
import asyncpg
import asyncio
import uuid
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
    # Extract just the filename regardless of whether DB stores full path or just filename
    # e.g. "MountainsImages/mt_bierstadt/mt_bierstadt.png" -> "mt_bierstadt.png"
    # e.g. "mt_bierstadt.png" -> "mt_bierstadt.png"
    filename = filename_or_key.split("/")[-1]
    stem = os.path.splitext(filename)[0]  # "mt_bierstadt"
    return f"{MOUNTAIN_PREFIX}{stem}/{filename}"  # "MountainsImages/mt_bierstadt/mt_bierstadt.png"



 # def list_mountain_image_keys(mountain_stem: str) -> list[str]: (OLD VERSION))
    """
    List every S3 object key under MountainsImages/{mountain_stem}/.
    Filters out any "directory placeholder" entries (keys ending with '/').
    """
    prefix = f"{MOUNTAIN_PREFIX}{mountain_stem}/"
    keys: list[str] = []
    continuation_token = None # for pagination, bug prevention in case of many images

    while True:
        kwargs = {"Bucket": S3_BUCKET, "Prefix": prefix}
        if continuation_token:
            # amazon's pagination uses a "continuation token" to get the next page of results
            kwargs["ContinuationToken"] = continuation_token

        response = s3.list_objects_v2(**kwargs)

        for obj in response.get("Contents", []):
            key = obj["Key"]
            if not key.endswith("/"):
                keys.append(key)

        if response.get("IsTruncated"):
            continuation_token = response.get("NextContinuationToken")
        else:
            break

    return keys 

def list_mountain_image_keys(mountain_stem: str) -> list[str]:
    prefix = f"{MOUNTAIN_PREFIX}{mountain_stem}/"
    response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)

    keys: list[str] = []
    for obj in response.get("Contents", []):
        if not obj["Key"].endswith("/"):
            keys.append(obj["Key"])

    return keys

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

DBurl = os.getenv("DATABASE_URL")

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
        # Migration: strip path prefix from image_url, keep only filename
        # e.g. "MountainsImages/mt_bierstadt/mt_bierstadt.png" -> "mt_bierstadt.png"
        await conn.execute("""
            UPDATE mountains
            SET image_url = regexp_replace(image_url, '^.+/', '')
            WHERE image_url LIKE '%/%'
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

    # DB stores filename like "mt_bierstadt.png"
    key = to_mountain_key(row["image_url"])  # -> "MountainsImages/mt_bierstadt/mt_bierstadt.png"
    return {"url": presigned_get_url(key)}


# Returns presigned URLs for every image in the mountain's S3 folder
# Other deifnition: every object under MountainsImages/{mountain_stem}/
@app.get("/mountains/{mountain_id}/gallery")
async def get_mountain_gallery(mountain_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT image_url FROM mountains WHERE uuid=$1::uuid",
            mountain_id
        )
    if not row:
        raise HTTPException(404, "Mountain not found")
    if not row["image_url"]:
        raise HTTPException(404, "No image associated with this mountain")

    # Consistency Rule: The image_url in the DB is just a filename (e.g. "mt_bierstadt.png"),
    # and the S3 folder structure is organized by mountain stem
    # (e.g. "MountainsImages/mt_bierstadt/mt_bierstadt.png").
    # This way, we can easily find all images for a mountain by using the stem as a prefix.
    stem = os.path.splitext(row["image_url"])[0]  # "mt_bierstadt"
    keys = list_mountain_image_keys(stem)

    # Exclude the stem/hero image (already served by /image-url).
    # Gallery should only contain the other images in the folder.
    stem_key = to_mountain_key(row["image_url"])  # "MountainsImages/mt_bierstadt/mt_bierstadt.png"
    keys = [k for k in keys if k != stem_key]

    urls = [presigned_get_url(key) for key in keys]
    return {"urls": urls}

@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
