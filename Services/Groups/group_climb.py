 # IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import enum

# --------------------
# SCHEMAS
# --------------------

class Group_Climb(BaseModel):
    name: str
    created_by: uuid.UUID
    created_at: Optional[datetime] = None

# --------------------
# DB Functions (CRUD) - GROUPS
# --------------------

async def create_group_climb(conn, group_id, mountain_id):
    row = await conn.fetchrow(
        """
        INSERT INTO group_climb(group_id, mountain_id)
        VALUES($1, $2)
        RETURNING group_climb_id
        """,
        group_id,
        mountain_id,
    )
    return dict(row)

async def update_group_climb(conn, group_climb_id: str, total_height=None, status=None):
    element_updates = {}
    if total_height is not None:
        element_updates["total_height"] = total_height
    if status is not None:
        element_updates["status"] = status
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE group_climb SET {set_clause} WHERE group_climb_id = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [group_climb_id]
    return await conn.execute(query, *values)

async def delete_group_climb(conn, group_climb_id):
    return await conn.execute(
        """
        DELETE FROM group_climb WHERE group_climb_id = $1
        """,
        group_climb_id,
    )

async def list_group_climbs(conn, group_id):
    rows = await conn.fetch(
        """
        SELECT * FROM group_climb WHERE group_id = $1
        """,
        group_id,
    )
    return [dict(row) for row in rows]

async def get_group_climb(conn, group_climb_id):
    row = await conn.fetchrow(
        """
        SELECT * FROM group_climb WHERE group_climb_id = $1
        """,
        group_climb_id,
    )
    return dict(row)



# --------------
# LIFESPAN
# --------------

DBurl = "postgresql://summit_admin:admin0415@localhost:5432/groups_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(DBurl)

    async with app.state.pool.acquire() as conn:
        # Needed for gen_random_uuid()
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        await conn.execute(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_climb_status') THEN
                    CREATE TYPE group_climb_status AS ENUM ('active', 'inactive');
                END IF;
            END$$;
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS group_climb (
                group_climb_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
                mountain_id uuid NOT NULL,
                total_height double precision NOT NULL DEFAULT 0,
                status group_climb_status NOT NULL DEFAULT 'active'
            );
            """
        )

    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

# --------------------
# ROUTES
# --------------------

@app.post("/group-climb/")
async def create_climb(group_id: uuid.UUID, mountain_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        new_climb = await create_group_climb(conn, group_id, mountain_id)
    return new_climb

@app.get("/group-climb/{group_climb_id}")
async def read_climb(group_climb_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        climb = await get_group_climb(conn, group_climb_id)
    if not climb:
        raise HTTPException(404, "Group Climb not found")
    return climb

@app.get("/group-climb/group/{group_id}")
async def list_climbs(group_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        climbs = await list_group_climbs(conn, group_id)
    return climbs

@app.put("/group-climb/{group_climb_id}")
async def update_climb(group_climb_id: uuid.UUID, total_height: Optional[float] = Body(None), status: Optional[str] = Body(None)):
    async with app.state.pool.acquire() as conn:
        result = await update_group_climb(conn, group_climb_id, total_height, status)
    if result == "UPDATE 0":
        raise HTTPException(404, "Group Climb not found")
    return {"message": "Group Climb updated successfully"}
