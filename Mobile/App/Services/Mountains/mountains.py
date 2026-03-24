# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from Services.config import PROGRESS_SERVICE_URL


# SCHEMA
class Mountain(BaseModel):
    name: str
    height: float
    location: str
    description: str | None = None
    url: str | None = None



# --------------------
# DB Functions (CRUD)
# --------------------


async def create_mountain(conn, name, height, location, description=None, image_url=None):
    row = await conn.fetchrow('''
        INSERT INTO mountains(name, height, location, description, image_url)
        VALUES($1, $2, $3, $4, $5)
        RETURNING uuid
    ''', name, height, location, description, image_url)

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
        SELECT uuid, name FROM mountains
    """)
    return [dict(row) for row in rows]


# --------------
# LIFESPAN 
# --------------

DBurl = "postgresql://postgres:admin@localhost:5432/mountains_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(
       DBurl
    )
    async with app.state.pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS mountains(
                uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL,
                height real NOT NULL,
                location text NOT NULL,
                description text,
                image_url text
        )
    """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)


# ----------
# ROUTES
# ----------
@app.post("/mountains")
async def add_mountain(mountain: Mountain):
    async with app.state.pool.acquire() as conn:
        new_id = await create_mountain(
            conn,
            mountain.name,
            mountain.height,
            mountain.location,
            mountain.description,
            mountain.url
            )
        
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
async def delete_mountain(mountain_id: str):
    async with app.state.pool.acquire() as conn:
        result = await delete_mountain(conn, mountain_id)

    if result.endswith("0"):
        raise HTTPException(404, "Mountain not found")

    return {"message": "Mountain deleted"}

# update mountain entry
@app.patch("/mountains/{mountain_id}")
async def patch_mountain(mountain_id: str, patch: dict = Body(...)):
    allowed = {"name", "height", "location", "description", "url"}
    data = {k: v for k, v in patch.items() if k in allowed and v is not None}
    if "url" in data:
        data["image_url"] = data.pop("url")

    async with app.state.pool.acquire() as conn:
        result = await update_mountain(conn, mountain_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "Mountain not found")
    return {"message": "Mountain updated"}
