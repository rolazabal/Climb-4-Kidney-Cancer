# IMPORTS
# type "fastapi dev mountains.py" in console to run
import os
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from datetime import *
from enum import Enum

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


class Events(BaseModel):
    name: str
    location: str
    start_time: int = 0
    end_time: int = 0

#class RegistrationStatus(str, Enum):
#    registered = "registered"
#    unregistered = "unregistered"

class EventRegistrations(BaseModel):
    event_id: uuid.UUID
    user_id: uuid.UUID
#    status: RegistrationStatus = RegistrationStatus.registered


class EventResults(BaseModel):
    event_id: uuid.UUID
    user_id: uuid.UUID
    completion_time: datetime | None = None
    recorded_at: datetime | None = None

# --------------------
# DB Functions (CRUD)
# --------------------

async def create_event(conn, name, location, start_time=None, end_time=None):
    row = await conn.fetchrow('''
        INSERT INTO events(name, location, start_time, end_time)
        VALUES($1, $2, $3, $4)
        RETURNING event_uuid
    ''', name, location, start_time, end_time)

    return str(row["event_uuid"])

async def update_event(conn, event_uuid: uuid.UUID, location=None, start_time=None, end_time=None):
    element_updates = {}
    if location is not None:
        element_updates["location"] = location
    if start_time is not None:
        element_updates["start_time"] = start_time
    if end_time is not None:
        element_updates["end_time"] = end_time
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE events SET {set_clause} WHERE event_uuid = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [event_uuid]
    return await conn.execute(query, *values)

async def delete_event(conn, event_id: uuid.UUID):
    row = await conn.execute(
        "DELETE FROM events WHERE event_uuid=$1",
        event_id
    )
    return row

async def get_events(conn,):
    rows = await conn.fetch("SELECT * FROM events")
    return [dict(row) for row in rows]

async def get_event(conn, event_id: uuid.UUID):
    row = await conn.fetchrow(
        "SELECT * FROM events WHERE event_uuid=$1",
        event_id
    )
    return row

# ---------------------------------------------------

async def create_registration(conn, event_id, user_id):
    row = await conn.fetchrow('''
        INSERT INTO event_registrations(event_uuid, user_id)
        VALUES($1, $2)
        RETURNING event_uuid
    ''', event_id, user_id)

    return str(row["event_uuid"])

async def delete_registration(conn, event_id: uuid.UUID, user_id: uuid.UUID):
    row = await conn.execute(
        "DELETE FROM event_registrations WHERE event_uuid=$1 AND user_id=$2",
        event_id, user_id
    )
    return row

async def get_registrations_by_event(conn, event_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM event_registrations WHERE event_uuid=$1",
        event_id
    )
    return [dict(row) for row in rows]

async def get_registrations_by_user(conn, user_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM event_registrations WHERE user_id=$1",
        user_id
    )
    return [dict(row) for row in rows]

# ---------------------------------------------------

async def create_result(conn, event_id, user_id, completion_time=None, recorded_at=None):
    row = await conn.fetchrow('''
        INSERT INTO event_results(event_id, user_id, completion_time, recorded_at)
        VALUES($1, $2, $3, $4)
        RETURNING result_id
    ''', event_id, user_id, completion_time, recorded_at)

    return str(row["result_id"])

async def update_result(conn, result_id: uuid.UUID, completion_time=None, recorded_at=None):
    element_updates = {}
    if completion_time is not None:
        element_updates["completion_time"] = completion_time
    if recorded_at is not None:
        element_updates["recorded_at"] = recorded_at
    if not element_updates:
        return "UPDATE 0"

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE event_results SET {set_clause} WHERE result_id = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [result_id]
    return await conn.execute(query, *values)

async def delete_result(conn, result_id: uuid.UUID):
    row = await conn.execute(
        "DELETE FROM event_results WHERE result_id=$1",
        result_id
    )
    return row

async def get_results_by_event(conn, event_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM event_results WHERE event_id=$1",
        event_id
    )
    return [dict(row) for row in rows]

async def get_results_by_user(conn, user_id: uuid.UUID):
    rows = await conn.fetch(
        "SELECT * FROM event_results WHERE user_id=$1",
        user_id
    )
    return [dict(row) for row in rows]

# --------------
# LIFESPAN
# --------------

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DBurl = f"postgresql://{DB_USER}:{DB_PASSWORD}@event-db:5432/events_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl)
    async with app.state.pool.acquire() as conn:

        #Create enum type if it doesn't exist
        #await conn.execute("""
        #    DO $$
        #    BEGIN
        #        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
        #            CREATE TYPE registration_status AS ENUM ('registered', 'unregistered');
        #        END IF;
        #    END$$;
        #""")

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS events(
                event_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL,
                location text NOT NULL,
                start_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_time timestamp
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS event_registrations(
                event_uuid uuid REFERENCES events(event_uuid) ON DELETE CASCADE,
                user_id uuid NOT NULL,
                PRIMARY KEY (event_uuid, user_id)
            );
        """)


        await conn.execute("""
            CREATE TABLE IF NOT EXISTS event_results(
                result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                event_id uuid NOT NULL REFERENCES events(event_uuid) ON DELETE CASCADE,
                completion_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                recorded_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)

# ----------
# ROUTES
# ----------

@app.post("/event/")
async def create_event_route(name: str, location: str, start_time: date | None = None, end_time: date | None = None):
    async with app.state.pool.acquire() as conn:
        result = await create_event(conn, name, location, start_time, end_time)
    if not result:
        raise HTTPException(404, "Event not found")
    return dict(result)

@app.put("/event/{event_id}")
async def update_event_route(event_id: str, location: str | None = None, start_time: date | None = None, end_time: date | None = None):
    async with app.state.pool.acquire() as conn:
        result = await update_event(conn, event_id, location, start_time, end_time)
    if result == "UPDATE 0":
        raise HTTPException(404, "Event not found")
    return {"message": "Event updated successfully"}

@app.delete("/event/{event_id}")
async def delete_event_route(event_id: str):
    async with app.state.pool.acquire() as conn:
        result = await delete_event(conn, event_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Event not found")
    return {"message": "Event deleted successfully"}

@app.get("/event/")
async def get_events_route():
    async with app.state.pool.acquire() as conn:
        result = await get_events(conn)

    if not result:
        raise HTTPException(404, "No events found")

    return [dict(record) for record in result]

@app.get("/event/{event_id}")
async def get_event_route(event_id: str):
    async with app.state.pool.acquire() as conn:
        result = await get_event(conn, event_id)
    if not result:
        raise HTTPException(404, "Event not found")
    return dict(result)

# ---------------------------------------------------

@app.post("/event/{event_id}/register")
async def create_registration_route(event_id: str, user_id: str):
    async with app.state.pool.acquire() as conn:
        result = await create_registration(conn, event_id, user_id)
    if not result:
        raise HTTPException(404, "Registration not created")
    return dict(result)

@app.delete("/event/{event_id}/register/{user_id}")
async def delete_registration_route(event_id: str, user_id: str):
    async with app.state.pool.acquire() as conn:
        result = await delete_registration(conn, event_id, user_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Registration not found")
    return {"message": "Registration deleted successfully"}

@app.get("/event/{event_id}/registrations")
async def get_registrations_by_event_route(event_id: str):
    async with app.state.pool.acquire() as conn:
        result = await get_registrations_by_event(conn, event_id)
    if not result:
        raise HTTPException(404, "No registrations found for this event")
    return result

@app.get("/event/{user_id}/registrations")
async def get_registrations_by_user_route(user_id: str):
    async with app.state.pool.acquire() as conn:
        result = await get_registrations_by_user(conn, user_id)
    if not result:
        raise HTTPException(404, "No registrations found for this user")
    return result

# ---------------------------------------------------

async def create_result(conn, event_id, user_id, completion_time=None, recorded_at=None):
    result = await conn.fetchrow('''
        INSERT INTO event_results(event_id, user_id, completion_time, recorded_at)
        VALUES($1, $2, $3, $4)
        RETURNING result_id
    ''', event_id, user_id, completion_time, recorded_at)

    return str(result["result_id"])

async def update_result(conn, result_id: uuid.UUID, completion_time=None, recorded_at=None):
    element_updates = {}
    if completion_time is not None:
        element_updates["completion_time"] = completion_time
    if recorded_at is not None:
        element_updates["recorded_at"] = recorded_at
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE event_results SET {set_clause} WHERE result_id = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [result_id]
    return await conn.execute(query, *values)

async def delete_result(conn, result_id: uuid.UUID):
    result = await conn.execute(
        "DELETE FROM event_results WHERE result_id=$1",
        result_id
    )
    return result

@app.get("/event/{event_id}/results")
async def get_results_by_event_route(event_id: str):
    async with app.state.pool.acquire() as conn:
        result = await get_results_by_event(conn, event_id)
    if not result:
        raise HTTPException(404, "No results found for this event")
    return result

@app.get("/event/{user_id}/results")
async def get_results_by_user_route(user_id: str):
    async with app.state.pool.acquire() as conn:
        result = await get_results_by_user(conn, user_id)
    if not result:
        raise HTTPException(404, "No results found for this user")
    return result

@app.get("/health")
async def health():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")