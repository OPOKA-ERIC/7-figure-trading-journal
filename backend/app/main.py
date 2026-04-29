from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.routes import auth, users, accounts, trades, psychology, analytics, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start weekly report scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from app.db.session import AsyncSessionLocal
        from app.services.notification_service import send_weekly_reports_to_all

        async def run_weekly_reports():
            async with AsyncSessionLocal() as db:
                result = await send_weekly_reports_to_all(db)
                print(f"Weekly reports: {result}")

        scheduler = AsyncIOScheduler()
        # Every Sunday at 08:00 UTC
        scheduler.add_job(run_weekly_reports, CronTrigger(day_of_week="sun", hour=8, minute=0))
        scheduler.start()
        print("Weekly report scheduler started")
    except ImportError:
        print("APScheduler not installed — weekly reports disabled. Run: pip install apscheduler")

    yield


app = FastAPI(
    title="7 Figure Trading Journal API",
    description="Smart Trading Performance & Psychology Intelligence Platform",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

# Build allowed origins list — always include the configured frontend URL
# plus common Vercel preview URL patterns
_allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
]
# Also allow all vercel.app subdomains for preview deployments
_allow_origin_regex = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_allow_origin_regex,
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
app.include_router(billing.router,    prefix="/api/v1/billing",    tags=["Billing"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="7 Figure Trading Journal API",
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
    )