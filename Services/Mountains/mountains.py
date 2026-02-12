#type "fastapi dev mountains.py" in console to run

from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Mountain(BaseModel):
    id: str
    name: str
    height: float
    location: str
    description: str
    url: str

@app.get("/")
def hello_world():
    return {"message": "Hello world."}
