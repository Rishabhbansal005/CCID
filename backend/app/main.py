"""CCID — Cyber Crime Investigation Dashboard
FastAPI Backend Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 CCID Backend API starting up...")
    logger.info(f"   Environment: {settings.environment}")
    logger.info(f"   Supabase URL: {settings.supabase_url or 'NOT SET'}")
    yield
    logger.info("🛑 CCID Backend API shutting down...")


app = FastAPI(
    title="CCID — Cyber Crime Investigation Dashboard",
    description=(
        "Digital forensics and cybercrime investigation platform API. "
        "Manage cases, evidence, findings, timelines, and generate reports."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ============================================================
# Middleware
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.environment == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# ============================================================
# Routes
# ============================================================

app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "CCID Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
