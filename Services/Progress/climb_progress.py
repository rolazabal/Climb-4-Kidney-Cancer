# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from datetime import date



# SCHEMA
class ClimbProgress(BaseModel):
    name: str
    mountain: str
    height: float
    start_date: date
    end_date: date | None = None

class ClimbProgressUpdate(BaseModel):
    height: float | None = None
    end_date: date | None = None

# --------------------
# DB Functions (CRUD)
# --------------------


async def create_climb_progress(conn, name, mountain, height, start_date, end_date=None):
    row = await conn.fetchrow('''
        INSERT INTO climbs(name, mountain, height, start_date, end_date)
        VALUES($1, $2, $3, $4, $5)
        RETURNING climb_uuid
    ''', name, mountain, height, start_date, end_date)

    return str(row["climb_uuid"])

async def update_climb_progress(conn, climb_uuid: str, height=None, end_date=None):
    element_updates = {}
    if height is not None:
        element_updates["height"] = height
    if end_date is not None:
        element_updates["end_date"] = end_date
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE climbs SET {set_clause} WHERE climb_uuid = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [climb_uuid]
    return await conn.execute(query, *values)


# "DELETE 1" or "DELETE 0"
async def delete_climb(conn, climb: str):
    row = await conn.execute(
        "DELETE FROM climbs WHERE climb_uuid=$1",
        climb
    )
    return row


async def read_climb(conn, climb: str):
    row = await conn.fetchrow(
        "SELECT * FROM climbs WHERE climb_uuid=$1",
        climb
    )
    return row


async def read_climb_by_user(conn, user: str):
    rows = await conn.fetch(
        "SELECT * FROM climbs WHERE name=$1",
        user
    )
    return [dict(row) for row in rows]


async def list_all_climbs(conn):
    rows = await conn.fetch(
        "SELECT * FROM climbs"
    )
    return [dict(row) for row in rows]

# --------------
# LIFESPAN
# --------------

DBurl = "postgresql://postgres:219448602@localhost:5433/progress_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl) # name refers to username
    async with app.state.pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS climbs(
                climb_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL,
                mountain text NOT NULL,
                height real NOT NULL,
                start_date date NOT NULL,
                end_date date
        )
    """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)


# ----------
# ROUTES
# ----------
@app.post("/progress")
async def add_climb(climb: ClimbProgress):
    async with app.state.pool.acquire() as conn:
        new_id = await create_climb_progress(
            conn,
            climb.name,
            climb.mountain,
            climb.height,
            climb.start_date
            )

    return {"id": new_id}

# get climb by id
@app.get("/climbs/id/{climb_id}")
async def get_climb(climb_id: str):

    async with app.state.pool.acquire() as conn:
        result = await read_climb(conn, climb_id)

    if not result:
        raise HTTPException(404, "Climb not found")

    return dict(result)

# get climbs by user
@app.get("/progress/{username}")
async def get_climbs_by_user(username: str):
    async with app.state.pool.acquire() as conn:
        result = await read_climb_by_user(conn, username)

    if not result:
        raise HTTPException(404, "Climbs not found for user")

    return [dict(record) for record in result]

# Returns id, name of all climbs
@app.get("/climbs")
async def get_climbs():
    async with app.state.pool.acquire() as conn:
        result = await list_all_climbs(conn)
    return [dict(record) for record in result]

# delete climb entry
@app.delete("/progress/{climb_id}")
async def delete_climb_by_id(climb_id: str):
    async with app.state.pool.acquire() as conn:
        result = await delete_climb(conn, climb_id)

    if result.endswith("0"):
        raise HTTPException(404, "Climb not found")

    return {"message": "Climb deleted"}

# update climb entry
@app.patch("/progress/{climb_id}")
async def patch_climb(climb_id: str, patch: ClimbProgressUpdate):

    data = patch.dict(exclude_unset=True)

    async with app.state.pool.acquire() as conn:
        result = await update_climb_progress(conn, climb_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "Climb not found")

    return {"message": "Climb updated"}