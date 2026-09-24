"""FastAPI app. Router-ууд, CORS, media, алдааны handler энд бүртгэгдэнэ."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .about.router_admin import router as about_admin_router
from .about.router_public import router as about_public_router
from .auth.router import router as auth_router
from .clubs.router_admin import router as clubs_admin_router
from .clubs.router_public import router as clubs_public_router
from .common import errors
from .config import settings
from .news.router_admin import router as news_admin_router
from .news.router_public import router as news_public_router
from .olympiad.router import router as olympiad_router
from .graduates.router_admin import router as graduates_admin_router
from .graduates.router_public import router as graduates_public_router
from .programs.router_admin import router as programs_admin_router
from .programs.router_public import router as programs_public_router
from .social.router import router as social_router
from .timetable.router_lessons import router as timetable_lessons_router
from .timetable.router_setup import router as timetable_setup_router

app = FastAPI(title="Шинэ Үе сургууль API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

errors.register(app)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(olympiad_router)
app.include_router(news_public_router)
app.include_router(news_admin_router)
app.include_router(social_router)
app.include_router(timetable_setup_router)
app.include_router(timetable_lessons_router)
app.include_router(clubs_public_router)
app.include_router(clubs_admin_router)
app.include_router(about_public_router)
app.include_router(about_admin_router)
app.include_router(programs_public_router)
app.include_router(programs_admin_router)
app.include_router(graduates_public_router)
app.include_router(graduates_admin_router)

settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")
