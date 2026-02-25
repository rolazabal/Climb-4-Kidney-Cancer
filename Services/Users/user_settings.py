# IMPORTS
# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel



# SCHEMA
class User_Settings(BaseModel):
    user_id: int
    notification_on: bool



# --------------------
# DB Functions (CRUD)
# --------------------

# change user notification setting
async def toggle_notification(conn, user_id: int, notification_on: bool):
    row = await conn.execute(
        "UPDATE user_settings SET notification_on = $2 WHERE user_id=$1",
        user_id, notification_on
    )
    return row

# ----------
# ROUTES
# ----------

# toggle notification setting
@app.put("/user_settings/{user_id}")
async def toggle_notification(user_id: int, notification_on: bool = Body(...)):
    async with app.state.pool.acquire() as conn:
        result = await toggle_notif(conn, user_id, notification_on)

    if result.endswith("0"):
        raise HTTPException(404, "User not found")

    return {"message": "Notification setting updated"}



# --------------
# LIFESPAN 
# --------------

DBurl = "postgresql://postgres:admin@localhost/users_service"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.pool = await asyncpg.create_pool(
        "postgresql://postgres:admin@localhost/users_service"
    )
    async with app.state.pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_settings(
                user_id int PRIMARY KEY,
                notification_on boolean NOT NULL DEFAULT true,
                CONSTRAINT fk_user_settings_user_id
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
        )
    """)

    yield

    # shutdown
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)