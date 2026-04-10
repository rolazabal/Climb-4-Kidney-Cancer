from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import httpx

app = FastAPI()

USERS_SERVICE = "http://users-service:8000"
MOUNTAINS_SERVICE = "http://mountains-service:8000"
PROGRESS_SERVICE = "http://progress-service:8000"
GROUP_SERVICE = "http://groups-service:8000"
EVENTS_SERVICE = "http://event-service:8000"
AUTH_SERVICE = "http://auth-service:8000"

BLOCKED_AUTH_PATHS = {"verify-token"}

async def forward_request(request: Request, service_url: str, path: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        url = f"{service_url}/{path}"

        try:
            response = await client.request(
                request.method,
                url,
                headers=request.headers.raw,
                content=await request.body()
            )
        except httpx.TimeoutException:
            return JSONResponse(
                status_code=504,
                content={"detail": "Service timed out"}
            )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=503,
                content={"detail": "Service unavailable"}
            )
        except Exception:
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal gateway error"}
            )

        try:
            content = response.json()
        except Exception:
            content = {"detail": "Invalid response from service"}
            
        return JSONResponse(
            content=content,
            status_code=response.status_code
        )


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def users_proxy(path: str, request: Request):
    return await forward_request(request, USERS_SERVICE, path)


@app.api_route("/mountains/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def mountains_proxy(path: str, request: Request):
    return await forward_request(request, MOUNTAINS_SERVICE, path)


@app.api_route("/progress/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def progress_proxy(path: str, request: Request):
    return await forward_request(request, PROGRESS_SERVICE, path)


@app.api_route("/groups/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def groups_proxy(path: str, request: Request):
    return await forward_request(request, GROUP_SERVICE, path)


@app.api_route("/events/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def events_proxy(path: str, request: Request):
    return await forward_request(request, EVENTS_SERVICE, path)

@app.api_route("/authentication/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(path: str, request: Request):
    if path in BLOCKED_AUTH_PATHS:
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return await forward_request(request, AUTH_SERVICE, path)