import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import lifespan
from logger import get_logger, setup_logging
from routers.admin import admin_router
from routers.auth_token import auth_token_router
from routers.bug_report import bug_report_router
from routers.contact import contact_router
from routers.cron_summary import cron_summary_router
from routers.feed import feed_router
from routers.follows import follows_router
from routers.grants import grants_router
from routers.groups import groups_router
from routers.mailing_list import mailing_list_router
from routers.messages import messages_router
from routers.profile_picture import profile_router
from routers.resume import resume_router
from routers.users import users_router
from routers.vector_store import vector_store_router
from routers.wishlist import router as wishlist_router

# setup logging
setup_logging()
logger = get_logger(__name__)

IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"

# Docs are only public locally. In production, use /admin/docs?token=<bearer_token>
fastapi_app = FastAPI(
    lifespan=lifespan,
    title="Research Team API",
    docs_url="/docs" if IS_LOCAL else None,
    redoc_url="/redoc" if IS_LOCAL else None,
    openapi_url="/openapi.json" if IS_LOCAL else None,
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://research.team",
        "https://www.research.team",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# all the routers info
fastapi_app.include_router(grants_router, tags=["grants"])
fastapi_app.include_router(users_router, tags=["users"])
fastapi_app.include_router(vector_store_router, tags=["vectorstore"])
fastapi_app.include_router(contact_router, tags=["contact"])
fastapi_app.include_router(profile_router, tags=["profilepicture"])
fastapi_app.include_router(resume_router, tags=["resume"])
fastapi_app.include_router(cron_summary_router, tags=["cronsummary"])
fastapi_app.include_router(mailing_list_router, tags=["mailinglist"])
fastapi_app.include_router(wishlist_router, tags=["wishlist"])
fastapi_app.include_router(bug_report_router, tags=["bug_report"])
fastapi_app.include_router(auth_token_router, tags=["auth"])
fastapi_app.include_router(feed_router, tags=["feed"])
fastapi_app.include_router(messages_router, tags=["messages"])
fastapi_app.include_router(groups_router, tags=["groups"])
fastapi_app.include_router(follows_router, tags=["follows"])
fastapi_app.include_router(admin_router, tags=["admin"])


@fastapi_app.get("/health")
async def root():
    return {"message": "Research Team API is Online"}


app = fastapi_app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app")
