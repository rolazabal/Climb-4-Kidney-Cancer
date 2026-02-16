# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
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
	''', uuid, name, height, location, description, image_url)
	return uuid

#def update_mountain(uuid, name = None, height = None, location = None, description = None, image_url = None):

# "DELETE 1" or "DELETE 0"
async def delete_mountain(conn, mountain_id: str):
    row = await conn.fetchrow(
        "DELETE FROM mountains WHERE uuid=$1",
        mountain_id
    )
    return row



async def read_mountain(conn, mountain_id: str):
    row = await conn.fetchrow(
        "SELECT * FROM mountains WHERE id=$1",
        mountain_id
    )
    return row

#def list_mountains():


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

    await app.state.conn.execute("""
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
    await app.state.conn.close()


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