from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .db import Base

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    notes = Column(String, default="")
    priority = Column(Integer, default=2)      # 1 high, 2 med, 3 low
    estimate_min = Column(Integer, default=30)
    status = Column(String, default="todo")    # todo, doing, done, blocked
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DayEvent(Base):
    __tablename__ = "day_events"
    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, nullable=False)      # started, done, blocked, deferred
    task_id = Column(Integer, nullable=True)
    meta = Column(String, default="")
    at = Column(DateTime, default=datetime.utcnow)

class DayPlan(Base):
    __tablename__ = "day_plans"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # YYYY-MM-DD
    plan_json = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
