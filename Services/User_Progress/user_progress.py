# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel



# SCHEMA
class Users(BaseModel):
    email: str
    username: str
    height: float
    location: str
    description: str | None = None
    url: str | None = None



# --------------------
# DB Functions (CRUD)
# --------------------

# simple uid generator
_next_uid = 0

def generate_uid():
    global _next_uid
    _next_uid += 1
    return _next_uid


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


