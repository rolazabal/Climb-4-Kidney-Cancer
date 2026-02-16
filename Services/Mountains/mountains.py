# type "fastapi dev mountains.py" in console to run
import asyncpg
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel



# database functions
#def generate_uuid():
#async def get_connection():
	


async def create_mountain(conn, name, height, location, description = None, image_url = None):
	uuid = "2"#generate_uuid()
	await conn.execute('''
		INSERT INTO mountains(uuid, name, height, location, description, image_url) VALUES($1, $2, $3, $4, $5, $6)
	''', uuid, name, height, location, description, image_url)
	return uuid

#def update_mountain(uuid, name = None, height = None, location = None, description = None, image_url = None):
	# 

#def delete_mountain():

async def read_mountain(uuid):
	result = await conn.fetchrow('''
		SELECT * FROM mountains WHERE uuid = $1
	''', uuid)
	return result

#def list_mountains():



# API
app = FastAPI()

class Mountain(BaseModel):
    id: str
    name: str
    height: float
    location: str
    description: str
    url: str
	


# @app.on_event("startup")
# async def startup():
#     app.state.conn = await asyncpg.connect(
#         "postgresql://postgres:admin@localhost/mountains_service"
#     )

#     await app.state.conn.execute("""
#         CREATE TABLE IF NOT EXISTS mountains(
#             uuid text PRIMARY KEY,
#             name text NOT NULL,
#             height real NOT NULL,
#             location text NOT NULL,
#             description text,
#             image_url text
#         )
#     """
    
#     print(await create_mountain(conn, "name", 3, "location"))
    
#     )
    
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    app.state.conn = await asyncpg.connect(
        "postgresql://postgres:admin@localhost/mountains_service"
    )

    await app.state.conn.execute("""
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
    await app.state.conn.close()


app = FastAPI(lifespan=lifespan)
