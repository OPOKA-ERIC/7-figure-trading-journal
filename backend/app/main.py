from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, users, accounts, trades, psychology, analytics

app = FastAPI(
    title="7 Figure Trading Journal API",
    description="Smart Trading Performance & Psychology Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["Auth"])
app.include_router(users.router,      prefix="/api/v1/users",      tags=["Users"])
app.include_router(accounts.router,   prefix="/api/v1/accounts",   tags=["Accounts"])
app.include_router(trades.router,     prefix="/api/v1/trades",     tags=["Trades"])
app.include_router(psychology.router, prefix="/api/v1/psychology", tags=["Psychology"])
app.include_router(analytics.router,  prefix="/api/v1/analytics",  tags=["Analytics"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}