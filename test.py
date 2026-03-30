import os
from jose import jwt

SECRET_KEY = os.getenv("AUTH_SECRET_KEY") or "super-secret-key"


token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTI4ODdiYi1iNDEyLTQ2NTctYmVmYi00YTliMzhmNjhiNDkiLCJlbWFpbCI6InNhZDEyM0BjYXNlLmVkdSIsImV4cCI6MTc3NDkwNjI5Mn0.C318exAbQN8gCTXQKYOglLDrKqW1PgxAh0roxbzekek"
alg = "HS256"

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    print(payload)
except Exception as e:
    print("Decode error:", e)