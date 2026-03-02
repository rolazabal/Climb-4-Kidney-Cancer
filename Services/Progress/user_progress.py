# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel



# SCHEMA
class User_Progress(BaseModel):
    user_id: uuid.UUID
    total_height: float = 0
    quest_points: int = 0
    mountains_climbed: int = 0

class ProgressDelta(BaseModel):
    delta_height: float = 0.0
    delta_points: int = 0
    delta_mountains: int = 0




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

# --------------
# LIFESPAN 
# --------------

DBurl = "postgresql://postgres:admin@localhost:5432/progress_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl)
    async with app.state.pool.acquire() as conn:
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



