from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .routers import auth, checklist, expenses, glossary, posts, profile, taxonomy
from .seed import run_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MVP: create_all + 시드. 스키마가 안정되면 Alembic으로 전환.
    Base.metadata.create_all(engine)
    run_seed()
    yield


app = FastAPI(title="맑음 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(profile.router)
app.include_router(taxonomy.router)
app.include_router(expenses.router)
app.include_router(checklist.router)
app.include_router(glossary.router)


@app.get("/api/health")
def health():
    return {"ok": True}
