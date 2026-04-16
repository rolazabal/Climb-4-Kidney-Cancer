# IMPORTS
# type "fastapi dev mountains.py" in console to run
import os

import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from datetime import date
from enum import Enum

class ClimbStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    complete = "complete"

# SCHEMA
class ClimbProgress(BaseModel):
    user_id: uuid.UUID
    mountain_id: uuid.UUID
    height: float = 0
    start_date: date | None = None # let DB default handle
    status: ClimbStatus = ClimbStatus.active


class ClimbProgressUpdate(BaseModel):
    height: float | None = None
    end_date: date | None = None
    status: ClimbStatus | None = None

# --------------------
# DB Functions (CRUD)
# --------------------


async def create_climb_progress(conn, user_id, mountain_id, height):
    row = await conn.fetchrow('''
        INSERT INTO climbs(user_id, mountain_id, height)
        VALUES($1, $2, $3)
        RETURNING climb_uuid
    ''', user_id, mountain_id, height)

    return str(row["climb_uuid"])

async def update_climb_progress(conn, climb_uuid: uuid.UUID, height=None, end_date=None, status=None):
    element_updates = {}
    if height is not None:
        element_updates["height"] = height
    if end_date is not None:
        element_updates["end_date"] = end_date
    if status is not None:
        element_updates["status"] = status
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE climbs SET {set_clause} WHERE climb_uuid = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [climb_uuid]
    return await conn.execute(query, *values)


# "DELETE 1" or "DELETE 0"
async def delete_climb(conn, climb_id: uuid.UUID):
    row = await conn.execute(
        "DELETE FROM climbs WHERE climb_uuid=$1",
        climb_id
    )
    return row

async def delete_climbs_by_user(conn, user_id: uuid.UUID):
    result = await conn.execute(
        "DELETE FROM climbs WHERE user_id=$1",
        user_id
    )
    return result

async def delete_climbs_by_mountain(conn, mountain_id: uuid.UUID):
    result = await conn.execute(
        "DELETE FROM climbs WHERE mountain=$1",
        mountain_id
    )
    return result

async def read_climb(conn, climb_id: uuid.UUID):
    row = await conn.fetchrow(
        "SELECT * FROM climbs WHERE climb_uuid=$1",
        climb_id
    )
    return row


async def read_active_climbs_by_user(conn, user_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM climbs WHERE user_id=$1 AND status='active'",
        user_id
    )
    return [dict(row) for row in rows]


async def read_climb_by_user(conn, user_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM climbs WHERE user_id=$1",
        user_id
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

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DBurl = f"postgresql://{DB_USER}:{DB_PASSWORD}@progress-db:5432/progress_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl) # name refers to username
    async with app.state.pool.acquire() as conn:
        
        # Create enum type if it doesn't exist
        await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'climb_status') THEN
                    CREATE TYPE climb_status AS ENUM ('active', 'inactive', 'complete');
                END IF;
            END$$;
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS climbs(
                climb_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                mountain_id uuid NOT NULL,
                height real NOT NULL,
                start_date date NOT NULL DEFAULT CURRENT_DATE,
                end_date date,
                status climb_status NOT NULL DEFAULT 'active'
            );
        """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)


# ----------
# ROUTES
# ----------
@app.post("/progress")
async def create_climb(climb: ClimbProgress):
    async with app.state.pool.acquire() as conn:
        new_id = await create_climb_progress(
            conn,
            climb.user_id,
            climb.mountain_id,
            climb.height
            )

    return {"id": new_id}

# Returns id, name of all climbs
@app.get("/climbs")
async def get_climbs():
    async with app.state.pool.acquire() as conn:
        result = await list_all_climbs(conn)
    return [dict(record) for record in result]


# get climb by id
@app.get("/climbs/id/{climb_id}")
async def get_climb(climb_id: str):

    async with app.state.pool.acquire() as conn:
        result = await read_climb(conn, climb_id)

    if not result:
        raise HTTPException(404, "Climb not found")

    return dict(result)

# get climbs by user
@app.get("/progress/user/{user_id}")
async def get_climbs_by_user(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await read_climb_by_user(conn, user_id)

    if not result:
        raise HTTPException(404, "Climbs not found for user")

    return [dict(record) for record in result]

# get active climbs by user
@app.get("/progress/user/{user_id}/active")
async def get_active_climbs_by_user(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await read_active_climbs_by_user(conn, user_id)
    if not result:
        raise HTTPException(404, "Climbs not found for user")

    return [dict(record) for record in result]

# get complete climbs by user
@app.get("/progress/user/{user_id}/complete")
async def get_completed_climbs_by_user(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await conn.fetch(
            "SELECT * FROM climbs WHERE user_id=$1 AND status='complete'",
            user_id
        )
    if not result:
        raise HTTPException(404, "No completed climbs found for user")
    return [dict(row) for row in result]

# delete climb entry
@app.delete("/progress/id/{climb_id}")
async def delete_climb_by_id(climb_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await delete_climb(conn, climb_id)

    if result.endswith("0"):
        raise HTTPException(404, "Climb not found")

    return {"message": "Climb deleted"}

# delete all of a user's climb entries
@app.delete("/progress/user/{user_id}")
async def delete_user(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await delete_climbs_by_user(conn, user_id)

    if result.endswith("0"):
        raise HTTPException(404, "Climbs not found for user")

    return {"message": "Climbs deleted"}

# delete all of a mountain's climb entries
@app.delete("/progress/mountain/{mountain_id}")
async def delete_mountain(mountain_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await delete_climbs_by_mountain(conn, mountain_id)
    if result.endswith("0"):
        raise HTTPException(404, "Climbs not found for user")

    return {"message": "Climbs deleted"}


# update climb entry
@app.patch("/progress/update/{climb_id}")
async def patch_climb(climb_id: uuid.UUID, patch: ClimbProgressUpdate):

    data = patch.dict(exclude_unset=True)

    async with app.state.pool.acquire() as conn:
        result = await update_climb_progress(conn, climb_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "Climb not found")

    return {"message": "Climb updated"}