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

class GroupClimbStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class GroupClimbProgressUpdate(BaseModel):
    heightdelta: Optional[float] = None
    status: Optional[GroupClimbStatus] = None

class RenameClimbRequest(BaseModel):
    new_name: str

# --------------------
# DB Functions (CRUD) - GROUP CLIMB
# --------------------

async def create_group_climb(conn, group_id, climb_name, mountain_id):
    row = await conn.fetchrow(
        """
        INSERT INTO group_climb(group_id, climb_name, mountain_id)
        VALUES($1, $2, $3)
        RETURNING group_climb_id
        """,
        group_id,
        climb_name,
        mountain_id,
    )
    return dict(row)

async def update_group_climb(conn, group_climb_id, heightdelta: float = 0.0, status: Optional[str] = None):
    row = await conn.fetchrow(
        """
        UPDATE group_climb
        SET
          total_height = GREATEST(0, total_height + $1),
          status = COALESCE($2::group_climb_status, status)
        WHERE group_climb_id = $3
        RETURNING group_climb_id, group_id, climb_name, mountain_id, total_height, status;
        """,
        heightdelta,
        status,
        group_climb_id,
    )
    return dict(row) if row else None

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
    return dict(row) if row else None

async def change_climb_name(conn, group_climb_id, new_name):
    row = await conn.fetchrow(
        """
        UPDATE group_climb
        SET climb_name = $1
        WHERE group_climb_id = $2
        RETURNING group_climb_id, climb_name;
        """,
        new_name,
        group_climb_id,
    )
    return dict(row) if row else None

# --------------
# LIFESPAN
# --------------

DBurl = "postgresql://summit_admin:admin0415@localhost:5432/groups_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(DBurl)

    async with app.state.pool.acquire() as conn:
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
                climb_name varchar(255) NOT NULL,
                mountain_id uuid NOT NULL,
                total_height double precision NOT NULL DEFAULT 0,
                status group_climb_status NOT NULL DEFAULT 'active',
                UNIQUE (group_id, climb_name)
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
async def create_climb(group_id: uuid.UUID, mountain_id: uuid.UUID, climb_name: str = Body(..., embed=True)):
    async with app.state.pool.acquire() as conn:
        try:
            new_climb = await create_group_climb(conn, group_id, climb_name, mountain_id)
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "climb_name already exists for this group")
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

@app.post("/group-climb/update/{group_climb_id}")
async def update_climb(group_climb_id: uuid.UUID, delta: GroupClimbProgressUpdate):
    heightdelta = delta.heightdelta if delta.heightdelta is not None else 0.0
    status = delta.status.value if delta.status is not None else None

    async with app.state.pool.acquire() as conn:
        result = await update_group_climb(conn, group_climb_id, heightdelta=heightdelta, status=status)

    if not result:
        raise HTTPException(404, "Group Climb not found")

    return result

@app.delete("/group-climb/{group_climb_id}")
async def delete_climb(group_climb_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await delete_group_climb(conn, group_climb_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Group Climb not found")
    return {"message": "Group Climb deleted successfully"}

@app.post("/group-climb/{group_climb_id}/rename")
async def rename_climb(group_climb_id: uuid.UUID, payload: RenameClimbRequest):
    async with app.state.pool.acquire() as conn:
        try:
            result = await change_climb_name(conn, group_climb_id, payload.new_name)
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "climb_name already exists for this group")

    if not result:
        raise HTTPException(404, "Group Climb not found")

    return {
        "message": "Group Climb renamed successfully",
        "group_climb_id": result["group_climb_id"],
        "new_name": result["climb_name"],
    }