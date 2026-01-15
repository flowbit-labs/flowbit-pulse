from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.db import Base, engine
from .core.config import cors_origins
from .routes import tasks, events, plan, review

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Flowbit Pulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(plan.router, prefix="/plan", tags=["plan"])
app.include_router(review.router, prefix="/review", tags=["review"])
