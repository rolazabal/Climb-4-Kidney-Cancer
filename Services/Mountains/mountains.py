#type "fastapi dev mountains.py" in console to run

from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel

app = FastAPI()

@app.get("/")
def hello_world():
    return {"message": "Hello world."}
