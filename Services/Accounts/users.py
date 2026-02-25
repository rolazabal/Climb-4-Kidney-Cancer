# IMPORTS
# type "fastapi dev users.py" in console to run
from datetime import date
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel



# SCHEMA
class User(BaseModel):
    email: str
    username: str
    dob: date | None = None
    bio: str | None = None
    profile_photo_media_id: str | None = None

class UserSettings(BaseModel):
    user_id: uuid.UUID
    notification_on: bool


# --------------------
# DB Functions (CRUD)
# --------------------

#async def get_connection():

async def create_user(conn, email, username, dob, bio = None, profile_photo_media_id = None):
    row = await conn.fetchrow('''
        INSERT INTO users(email, username, dob, bio, profile_photo_media_id) 
        VALUES($1, $2, $3, $4, $5) 
        RETURNING uuid
    ''', email, username, dob, bio, profile_photo_media_id)
    
    return str(row["uuid"])

async def update_user(conn, user_id: str, email=None, username=None, dob=None, bio=None, profile_photo_media_id=None):
    element_updates = {}
    if email is not None:
        element_updates["email"] = email
    if username is not None:
        element_updates["username"] = username
    if dob is not None:
        element_updates["dob"] = dob
    if bio is not None:
        element_updates["bio"] = bio
    if profile_photo_media_id is not None:
        element_updates["profile_photo_media_id"] = profile_photo_media_id
    if not element_updates:
        return "UPDATE 0"  # or raise ValueError / HTTPException

    set_clause = ", ".join(
        f"{col} = ${i}" for i, col in enumerate(element_updates.keys(), start=1)
    )
    query = f"UPDATE users SET {set_clause} WHERE id = ${len(element_updates) + 1}"

    values = list(element_updates.values()) + [user_id]
    return await conn.execute(query, *values)

async def delete_user(conn, user_id: str):
    return await conn.execute('''
        DELETE FROM users WHERE uuid = $1
    ''', user_id)

async def read_user(conn, user_id: str):
    return await conn.fetchrow('''
        SELECT * FROM users WHERE uuid = $1
    ''', user_id)

async def read_user_by_name(conn, username: str):
    return await conn.fetchrow('''
        SELECT * FROM users WHERE username = $1
    ''', username)

async def list_users(conn):
    return await conn.fetch('''
        SELECT * FROM users
    ''')

async def toggle_notification(conn, user_id: uuid.UUID, notification_on: bool):
    row = await conn.execute(
        "UPDATE user_settings SET notification_on = $2 WHERE user_id=$1",
        user_id, notification_on
    )

# --------------
# LIFESPAN 
# --------------

DBurl = "postgresql://postgres:admin@localhost:5432/accounts_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(DBurl)
    async with app.state.pool.acquire() as conn:
        
        # enable UUID generation
        await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users(
                uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                email varchar(255) NOT NULL UNIQUE,
                username varchar NOT NULL UNIQUE,
                dob DATE,
                bio TEXT,
                profile_photo_media_id varchar(255)
            )
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_settings(
                    user_id uuid PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
                    notification_on boolean NOT NULL DEFAULT true
                )
        """)
    
    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)



# ----------
# ROUTES
# ----------

@app.post("/users")
async def add_user(users: User):
    async with app.state.pool.acquire() as conn:
        new_id = await create_user(
            conn,
            users.email,
            users.username,
            users.dob,
            users.bio,
            users.profile_photo_media_id
        )
        
    return {"id": new_id}

# get user by id
@app.get("/users/{users_id}")
async def get_user(users_id: str):

    async with app.state.pool.acquire() as conn:
        result = await read_user(conn, users_id)

    if not result:
        raise HTTPException(404, "User not found")

    return dict(result)

# get user by name
@app.get("/users/{username}")
async def get_user_by_name(username: str):
    async with app.state.pool.acquire() as conn:
        result = await read_user_by_name(conn, username)

    if not result:
        raise HTTPException(404, "User not found")

    return dict(result)


# delete user entry
@app.delete("/users/{users_id}")
async def delete_user(users_id: str):
    async with app.state.pool.acquire() as conn:
        result = await delete_user(conn, users_id)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "User deleted"}

# update user entry
@app.patch("/users/{users_id}")
async def patch_user(users_id: str, patch: dict = Body(...)):
    allowed = {"email", "username", "dob", "bio", "profile_photo_media_id"}
    data = {k: v for k, v in patch.items() if k in allowed and v is not None}
    if "url" in data:
        data["image_url"] = data.pop("url")

    async with app.state.pool.acquire() as conn:
        result = await update_user(conn, users_id, **data)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")
    return {"message": "User updated"}

# get all users
@app.get("/users")
async def get_users():
    async with app.state.pool.acquire() as conn:
        result = await list_users(conn)

    if not result:
        raise HTTPException(404, "No users found")

    return [dict(record) for record in result]  

# toggle notification setting
@app.put("/user_settings/{user_id}")
async def toggle(user_id: int, notification_on: bool = Body(...)):
    async with app.state.pool.acquire() as conn:
        result = await toggle_notification(conn, user_id, notification_on)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "Notification setting updated"}