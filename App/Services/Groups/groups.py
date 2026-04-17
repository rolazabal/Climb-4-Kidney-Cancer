# IMPORTS
# type "fastapi dev mountains.py" in console to run
import os
import asyncpg
import uuid
import enum
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import asyncio
import httpx

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

# --------------------
# SCHEMAS: GROUPS
# --------------------

class Group(BaseModel):
    name: str
    created_by: uuid.UUID
    created_at: Optional[datetime] = None

class Group_Members(BaseModel):
    role: str

# --------------------
# SCHEMAS: GROUP CLIMB
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
# DB Functions (CRUD) - GROUPS
# --------------------

async def create_group(conn, name, created_by):
    row = await conn.fetchrow(
        """
        INSERT INTO groups(name, created_by)
        VALUES($1, $2)
        RETURNING group_id
        """,
        name,
        created_by,
    )
    return dict(row)

async def update_group(conn, group_id: str, name=None):
    element_updates = {}
    if name is not None:
        element_updates["name"] = name
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE groups SET {set_clause} WHERE group_id = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [group_id]
    return await conn.execute(query, *values)

async def delete_group(conn, group_id):
    return await conn.execute(
        """
        DELETE FROM groups WHERE group_id = $1
        """,
        group_id,
    )

async def get_group(conn, group_id):
    row = await conn.fetchrow(
        """
        SELECT * FROM groups WHERE group_id = $1
        """,
        group_id,
    )

    if row:
        return dict(row)
    raise HTTPException(404, "Group not found")

async def list_groups(conn):
    rows = await conn.fetch(
        """SELECT * FROM groups"""
    )
    return [dict(row) for row in rows]

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


# --------------------
# DB Functions (CRUD) - GROUP MEMBERS
# --------------------

async def add_member(conn, group_id, user_id, role):
    row = await conn.fetchrow("""
        INSERT INTO group_members(group_id, user_id, role)
        VALUES($1, $2, $3)
        RETURNING group_id, user_id, role""",
        group_id,user_id,role,
    )
    return dict(row)

async def update_member_role(conn, group_id, user_id, new_role):
    result = await conn.execute("""
        UPDATE group_members
        SET role = $1
        WHERE group_id = $2 AND user_id = $3""",
        new_role,group_id,user_id,
    )
    return result

async def remove_member(conn, group_id, user_id):
    result = await conn.execute("""
        DELETE FROM group_members
        WHERE group_id = $1 AND user_id = $2""",
        group_id,
        user_id,
    )
    return result

async def list_group_members(conn, group_id):
    rows = await conn.fetch("""
        SELECT user_id, role
        FROM group_members
        WHERE group_id = $1""",
        group_id,
    )
    return [dict(row) for row in rows]

async def get_member_role(conn, group_id, user_id):
    row = await conn.fetchrow("""
        SELECT role
        FROM group_members
        WHERE group_id = $1 AND user_id = $2""",
        group_id,
        user_id,
    )

    if row:
        return row["role"]
    raise HTTPException(404, "Member not found in group")


async def get_all_groups_with_members(conn):
    """
    Replaces the previous manual JOIN and dictionary building logic.
    Uses the SQL View for instant data retrieval.
    """
    rows = await conn.fetch("SELECT * FROM view_group_stats")
    
    # asyncpg rows can be converted to dicts easily
    # and PostgreSQL arrays automatically become Python lists.
    return [dict(row) for row in rows]


async def fetch_user_height(client: httpx.AsyncClient, user_id: str) -> float:
    """
    Fetches a single user's total_height from the progress service.
    Returns 0.0 on any error so one bad user doesn't break the leaderboard.
    """
    try:
        resp = await client.get(
            f"{PROGRESS_SERVICE_URL}/user-progress/{user_id}",
            timeout=5.0,
        )
        if resp.status_code == 200:
            return resp.json().get("total_height", 0.0)
    except Exception:
        pass
    return 0.0


async def compute_group_score(client: httpx.AsyncClient, group: dict) -> dict:
    """
    Fans out height fetches for all members of a group concurrently,
    then sums them into a group score.
    """
    if not group["member_ids"]:
        return {**group, "total_height": 0.0, "member_count": 0}

    heights = await asyncio.gather(
        *[fetch_user_height(client, uid) for uid in group["member_ids"]]
    )

    return {
        "group_id": group["group_id"],
        "name": group["name"],
        "total_height": round(sum(heights), 2),
        "member_count": len(group["member_ids"]),
    }


# --------------------
# DB Functions (CRUD) - GROUP INVITES
# --------------------

async def create_invite(conn, group_id, invitee_id):
    row = await conn.fetchrow(
        """
        INSERT INTO group_invites(group_id, invitee_id)
        VALUES($1, $2)
        RETURNING invite_id, group_id, invitee_id, status, created_at
        """,
        group_id,
        invitee_id,
    )
    return dict(row)


async def list_invites_for_group(conn, group_id):
    rows = await conn.fetch(
        """
        SELECT * FROM group_invites WHERE group_id = $1
        ORDER BY created_at DESC
        """,
        group_id,
    )
    return [dict(row) for row in rows]


async def list_invites_for_user(conn, user_id):
    rows = await conn.fetch(
        """
        SELECT * FROM group_invites WHERE invitee_id = $1
        ORDER BY created_at DESC
        """,
        user_id,
    )
    return [dict(row) for row in rows]


async def update_invite(conn, invite_id, invitee_id, status: str):
    """
    Updates the invite status. Returns the updated row, or None if
    the invite doesn't exist or doesn't belong to invitee_id.
    """
    row = await conn.fetchrow(
        """
        UPDATE group_invites
        SET status = $1::invite_status
        WHERE invite_id = $2
          AND invitee_id = $3
          AND status = 'pending'
        RETURNING invite_id, group_id, invitee_id, status
        """,
        status,
        invite_id,
        invitee_id,
    )
    return dict(row) if row else None


# --------------
# LIFESPAN: GROUPS
# --------------

DBurl = os.getenv("DATABASE_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(DBurl)

    async with app.state.pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

        # GROUPS TABLES
        await conn.execute("""
        CREATE TABLE IF NOT EXISTS groups (
            group_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name varchar(255) UNIQUE NOT NULL,
            created_by uuid NOT NULL,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP
        );
        """)

        await conn.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
                CREATE TYPE group_role AS ENUM ('Leader', 'Member');
            END IF;
        END$$;
        """)

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS group_members (
            group_id uuid REFERENCES groups(group_id) ON DELETE CASCADE,
            user_id uuid NOT NULL,
            role group_role NOT NULL DEFAULT 'Member',
            PRIMARY KEY (group_id, user_id)
        );
        """)

        # GROUP CLIMB TABLES
        await conn.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_climb_status') THEN
                CREATE TYPE group_climb_status AS ENUM ('active', 'inactive');
            END IF;
        END$$;
        """)

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS group_climb (
            group_climb_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
            climb_name varchar(255) NOT NULL,
            mountain_id uuid NOT NULL,
            total_height double precision NOT NULL DEFAULT 0,
            status group_climb_status NOT NULL DEFAULT 'active',
            UNIQUE (group_id, climb_name)
        );
        """)

        # INVITE STATUS ENUM + TABLE
        await conn.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
                CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
            END IF;
        END$$;
        """)

        await conn.execute("""
        CREATE TABLE IF NOT EXISTS group_invites (
            invite_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            group_id    uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
            invitee_id  uuid NOT NULL,
            status      invite_status NOT NULL DEFAULT 'pending',
            created_at  timestamp DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (group_id, invitee_id)          -- prevent duplicate pending invites
        );
        """)

        await conn.execute("""
        CREATE VIEW view_group_stats AS
        SELECT 
            g.group_id, 
            g.name, 
            count(gm.user_id) as member_count,
            array_agg(gm.user_id) as member_ids
        FROM groups g
        LEFT JOIN group_members gm ON g.group_id = gm.group_id
        GROUP BY g.group_id, g.name;
        """)

        await conn.execute("""
        CREATE VIEW view_active_group_climbs AS
        SELECT 
            gc.group_climb_id,
            g.name AS group_name,
            gc.climb_name,
            gc.total_height,
            gc.status
        FROM group_climb gc
        JOIN groups g ON gc.group_id = g.group_id
        WHERE gc.status = 'active';
        """)

    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)


# ----------
# ROUTES - GROUPS
# ----------

@app.post("/groups/")
async def make_group(group: Group, current_user: str = Depends(get_current_user)):
    """
    Requirement:
    - Creator is automatically added to group_members with role = 'Leader'
    """
    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            new_id = await create_group(conn, group.name, group.created_by)
            group_id = new_id["group_id"]

            # Set creator as Leader by default
            await add_member(conn, group_id, group.created_by, "Leader")

    return {"message": "Group created successfully", "id": new_id}

@app.get("/groups/{group_id}")
async def read_group(group_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        result = await get_group(conn, group_id)
    return {"message": "Group retrieved successfully", "group": result}

@app.get("/groups/")
async def read_groups():
    async with app.state.pool.acquire() as conn:
        groups = await list_groups(conn)
    return groups

@app.put("/groups/{group_id}")
async def update_group_info(
    group_id: uuid.UUID,
    name: str = Body(None),
    current_user: str = Depends(get_current_user)
):
    async with app.state.pool.acquire() as conn:
        result = await update_group(conn, group_id, name)
    if result == "UPDATE 0":
        raise HTTPException(404, "Group not found")
    return {"message": "Group updated successfully"}

@app.delete("/groups/{group_id}")
async def remove_group(
    group_id: uuid.UUID,
    current_user: str = Depends(get_current_user)
):
    async with app.state.pool.acquire() as conn:
        result = await delete_group(conn, group_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Group not found")
    return {"message": "Group deleted successfully"}


# ----------
# ROUTES - GROUP MEMBERS
# ----------

@app.post("/groups/{group_id}/members/")
async def add_group_member(group_id: uuid.UUID,user_id: uuid.UUID, current_user: str = Depends(get_current_user)):
    """
    Requirement:
    - Any user added to an existing group is role = 'Member' by default
    (Role is NOT accepted from the client in this endpoint.)
    """
    async with app.state.pool.acquire() as conn:
        member_added = await add_member(conn, group_id, user_id, "Member")
    return member_added

@app.get("/groups/{group_id}/members/")
async def get_group_members(group_id: uuid.UUID):
    async with app.state.pool.acquire() as conn:
        members = await list_group_members(conn, group_id)
    return members

@app.put("/groups/{group_id}/members/{user_id}")
async def update_group_member_role(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    new_role: str = Body(..., embed=True),
    current_user: str = Depends(get_current_user)
):
    # Only allow the two roles we support now
    if new_role not in ("Leader", "Member"):
        raise HTTPException(400, "Invalid role. Must be 'Leader' or 'Member'.")

    async with app.state.pool.acquire() as conn:
        result = await update_member_role(conn, group_id, user_id, new_role)

    if result == "UPDATE 0":
        raise HTTPException(404, "Member not found in group")

    return {"message": "Member role updated successfully"}

@app.delete("/groups/{group_id}/members/{user_id}")
async def delete_group_member(group_id: uuid.UUID, user_id: uuid.UUID, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await remove_member(conn, group_id, user_id)

    if result == "DELETE 0":
        raise HTTPException(404, "Member not found in group")

    return {"message": "Member removed from group successfully"}

# --------------------
# ROUTES:Group Climb
# --------------------

@app.post("/group-climb/")
async def create_climb(group_id: uuid.UUID, mountain_id: uuid.UUID, climb_name: str = Body(..., embed=True), current_user: str = Depends(get_current_user)):
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
async def update_climb(group_climb_id: uuid.UUID, delta: GroupClimbProgressUpdate, current_user: str = Depends(get_current_user)):
    heightdelta = delta.heightdelta if delta.heightdelta is not None else 0.0
    status = delta.status.value if delta.status is not None else None

    async with app.state.pool.acquire() as conn:
        result = await update_group_climb(conn, group_climb_id, heightdelta=heightdelta, status=status)

    if not result:
        raise HTTPException(404, "Group Climb not found")

    return result

@app.delete("/group-climb/{group_climb_id}")
async def delete_climb(group_climb_id: uuid.UUID, current_user: str = Depends(get_current_user)):
    async with app.state.pool.acquire() as conn:
        result = await delete_group_climb(conn, group_climb_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Group Climb not found")
    return {"message": "Group Climb deleted successfully"}

@app.post("/group-climb/{group_climb_id}/rename")
async def rename_climb(group_climb_id: uuid.UUID, payload: RenameClimbRequest, current_user: str = Depends(get_current_user)):
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

@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")


# --------------------
# ROUTES: Group invites
# --------------------

@app.post("/groups/{group_id}/invites/")
async def send_invite(
    group_id: uuid.UUID,
    invitee_id: uuid.UUID,
    current_user: str = Depends(get_current_user)
):
    """
    Leader sends an invite to a user. Fails with 409 if a pending
    invite for this user already exists in this group.
    """
    async with app.state.pool.acquire() as conn:
        try:
            invite = await create_invite(conn, group_id, invitee_id)
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "A pending invite already exists for this user")
    return {"message": "Invite sent", "invite": invite}


@app.get("/groups/{group_id}/invites/")
async def read_group_invites(
    group_id: uuid.UUID,
    current_user: str = Depends(get_current_user)
):
    """List all invites for a group."""
    async with app.state.pool.acquire() as conn:
        invites = await list_invites_for_group(conn, group_id)
    return invites


@app.get("/users/{user_id}/invites/")
async def read_user_invites(user_id: uuid.UUID, current_user: str = Depends(get_current_user)):
    """List all invites for a user."""
    if str(current_user) != str(user_id):
        raise HTTPException(403, "Can only view your own invites")

    async with app.state.pool.acquire() as conn:
        invites = await list_invites_for_user(conn, user_id)
    return invites


@app.post("/invites/{invite_id}/accept")
async def accept_invite(
    invite_id: uuid.UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Invitee accepts their invite. Atomically marks the invite as
    accepted and adds the user to group_members as 'Member'.
    """
    user_id = uuid.UUID(str(current_user))

    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            updated = await update_invite(conn, invite_id, user_id, "accepted")
            if not updated:
                raise HTTPException(
                    404,
                    "Invite not found, already responded to, or not addressed to you",
                )
            await add_member(conn, updated["group_id"], user_id, "Member")

    return {"message": "Invite accepted, you have joined the group", "invite": updated}


@app.post("/invites/{invite_id}/decline")
async def decline_invite(
    invite_id: uuid.UUID,
    current_user: str = Depends(get_current_user),
):
    """Invitee declines their invite."""
    user_id = uuid.UUID(str(current_user))

    async with app.state.pool.acquire() as conn:
        updated = await update_invite(conn, invite_id, user_id, "declined")

    if not updated:
        raise HTTPException(
            404,
            "Invite not found, already responded to, or not addressed to you",
        )
    return {"message": "Invite declined", "invite": updated}


# --------------------
# ROUTES: Leaderboard
# --------------------

@app.get("/leaderboard")
async def get_leaderboard(limit: int = 10, offset: int = 0):
    """
    Returns groups ranked by combined total_height of all members.
    Fans out to the progress service concurrently for all groups.

    Query params:
      limit  — number of results to return (default 10, max 100)
      offset — for pagination (default 0)
    """
    limit = min(limit, 100)  # cap to prevent abuse

    async with app.state.pool.acquire() as conn:
        groups = await get_all_groups_with_members(conn)
    if not groups:
        return {"leaderboard": [], "total_groups": 0}

    # Fan out ALL group score computations concurrently
    async with httpx.AsyncClient() as client:
        scored_groups = await asyncio.gather(
            *[compute_group_score(client, g) for g in groups]
        )

    ranked = sorted(scored_groups, key=lambda g: g["total_height"], reverse=True)

    # Attach rank after sorting, then paginate
    for i, group in enumerate(ranked, start=1):
        group["rank"] = i

    page = ranked[offset : offset + limit]

    return {
        "leaderboard": page,
        "total_groups": len(ranked),
        "offset": offset,
        "limit": limit,
    }


@app.get("/leaderboard/{group_id}")
async def get_group_rank(group_id: uuid.UUID):
    """
    Returns a single group's leaderboard entry and its current rank
    among all groups. Useful for showing a group 'your rank is #4'.
    """
    async with app.state.pool.acquire() as conn:
        groups = await get_all_groups_with_members(conn)

    group_ids = [g["group_id"] for g in groups]
    if str(group_id) not in group_ids:
        raise HTTPException(404, "Group not found")

    async with httpx.AsyncClient() as client:
        scored_groups = await asyncio.gather(
            *[compute_group_score(client, g) for g in groups]
        )

    ranked = sorted(scored_groups, key=lambda g: g["total_height"], reverse=True)

    for i, group in enumerate(ranked, start=1):
        if group["group_id"] == str(group_id):
            return {**group, "rank": i, "total_groups": len(ranked)}

    raise HTTPException(404, "Group not found in leaderboard")
