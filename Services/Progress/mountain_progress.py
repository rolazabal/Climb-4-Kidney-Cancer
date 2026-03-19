# IMPORTS
# type "fastapi dev mountains.py" in console to run
import os
import asyncpg
import asyncio
import uuid
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from datetime import date
from enum import Enum

from Services.config import USERS_SERVICE_URL, MOUNTAINS_SERVICE_URL # For http/ports


# SCHEMA (Users)
class User_Progress(BaseModel):
    user_id: uuid.UUID
    total_height: float = 0
    quest_points: int = 0
    mountains_climbed: int = 0

class ProgressDelta(BaseModel):
    delta_height: float = 0.0
    delta_points: int = 0
    delta_mountains: int = 0

# SCHEMA (Climbs)
class ClimbStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    complete = "complete"

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

async def create_user_progress(conn, user_id):
    row = await conn.fetchrow(
        """
        INSERT INTO user_progress (user_id, total_height, quest_points, mountains_climbed)
        VALUES ($1, 0, 0, 0)
        RETURNING user_id
        """,
        user_id
    )
    return dict(row)

async def read_user_progress(conn, user_id):
    row = await conn.fetchrow(
        "SELECT * FROM user_progress WHERE user_id=$1",
        user_id
    )
    if row:
        return dict(row)
    else:
        raise HTTPException(404, "User not found")

async def apply_progress_update(conn, user_id, delta_height=0.0, delta_points=0, delta_mountains=0):
    row = await conn.fetchrow(
        """
        INSERT INTO user_progress (user_id, total_height, quest_points, mountains_climbed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_height = GREATEST(0, user_progress.total_height + EXCLUDED.total_height),
          quest_points = GREATEST(0, user_progress.quest_points + EXCLUDED.quest_points),
          mountains_climbed = GREATEST(0, user_progress.mountains_climbed + EXCLUDED.mountains_climbed)
        RETURNING user_id, total_height, quest_points, mountains_climbed;
        """,
        user_id, delta_height, delta_points, delta_mountains
    )
    return dict(row)

async def delete_user_progress(conn, user_id):
    row = await conn.execute(
        "DELETE FROM user_progress WHERE user_id=$1",
        user_id
    )
    return row

# Climb DB Functions

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
    app.state.pool = await asyncpg.create_pool(DBurl)
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

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress(
                user_id uuid PRIMARY KEY,
                total_height double precision NOT NULL DEFAULT 0,
                quest_points integer NOT NULL DEFAULT 0,
                mountains_climbed integer NOT NULL DEFAULT 0
            );
        """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)

# ----------
# ROUTES
# ----------

@app.post("/user-progress/")
async def create_progress(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        return await create_user_progress(conn, user_id)
    if not result:
        raise HTTPException(404, "User Progress not found")
    return dict(result)

@app.get("/user-progress/{user_id}")
async def get_progress(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await read_user_progress(conn, user_id)
    if not result:
        raise HTTPException(404, "User Progress not found")
    return dict(result)

@app.post("/user-progress/update/{user_id}")
async def update_progress(user_id: uuid.UUID, delta: ProgressDelta):
    async with app.state.pool.acquire() as conn:
        result = await apply_progress_update(
            conn,
            user_id,
            delta_height=delta.delta_height,
            delta_points=delta.delta_points,
            delta_mountains=delta.delta_mountains
        )
    if not result:
        raise HTTPException(404, "User Progress not found")
    return dict(result)

@app.delete("/user-progress/{user_id}")
async def delete_progress(user_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await delete_user_progress(conn, user_id)
    if result == "DELETE 0":
        raise HTTPException(404, "User Progress not found")
    return {"message": "User Progress deleted successfully"}



@app.post("/progress")
async def create_climb(climb: ClimbProgress):
    
    async with httpx.AsyncClient() as client:
        
        # Check if user exists
        user_response = await client.get(
            f"{USERS_SERVICE_URL}/users/id/{climb.user_id}"
        )
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid User ID")
        
        # Check if mountain exists
        mountain_response = await client.get(
            f"{MOUNTAINS_SERVICE_URL}/mountains/{climb.mountain_id}"
        )
        if mountain_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Mountain ID")

    
    # Create Climb Progress after User/Mountain Verification
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
async def get_climb(climb_id: uuid.UUID):

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