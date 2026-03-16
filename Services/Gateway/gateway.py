from fastapi import FastAPI, Request
import httpx

app = FastAPI()

USERS_SERVICE = "http://users-service:8000"
MOUNTAINS_SERVICE = "http://mountains-service:8000"
PROGRESS_SERVICE = "http://progress-service:8000"


async def forward_request(request: Request, service_url: str, path: str):
    async with httpx.AsyncClient() as client:
        url = f"{service_url}/{path}"

        response = await client.request(
            request.method,
            url,
            headers=request.headers.raw,
            content=await request.body()
        )

        return response.json()


@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def users_proxy(path: str, request: Request):
    return await forward_request(request, USERS_SERVICE, path)


@app.api_route("/mountains/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def mountains_proxy(path: str, request: Request):
    return await forward_request(request, MOUNTAINS_SERVICE, path)


@app.api_route("/progress/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def progress_proxy(path: str, request: Request):
    return await forward_request(request, PROGRESS_SERVICE, path)