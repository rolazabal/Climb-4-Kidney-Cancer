# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel



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

#def generate_uuid():
#async def get_connection():
	

async def create_mountain(conn, name, height, location, description = None, image_url = None):
	new_id = str(uuid.uuid4()) # generating ID
 
	await conn.execute('''
		INSERT INTO mountains(uuid, name, height, location, description, image_url) VALUES($1, $2, $3, $4, $5, $6)
	''', new_id, name, height, location, description, image_url)
	return new_id

async def update_mountain(conn, mountain_uuid: str, name=None, height=None, location=None, description=None, image_url=None):
    element_updates = {}
    if name is not None:
        updates["name"] = name
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

#def delete_mountain():

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

DBurl = "postgresql://postgres:admin@localhost/mountains_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(
        "postgresql://postgres:admin@localhost/mountains_service"
    )
    async with app.state.pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS mountains(
                uuid text PRIMARY KEY,
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
        new_id = await create_mountain(conn, mountain)
    return {"id": new_id}


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