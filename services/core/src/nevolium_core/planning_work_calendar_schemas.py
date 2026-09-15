from __future__ import annotations

import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _minute(value: str, *, allow_24: bool) -> int:
    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
    except (ValueError, AttributeError) as exc:
        raise ValueError("work time must use HH:MM") from exc
    if len(value) != 5 or value[2] != ":" or not (0 <= minute <= 59):
        raise ValueError("work time must use HH:MM")
    if hour == 24 and minute == 0 and allow_24:
        return 1440
    if not 0 <= hour <= 23:
        raise ValueError("work time must use HH:MM within the local day")
    return hour * 60 + minute


class WorkInterval(BaseModel):
    start: str
    end: str

    @model_validator(mode="after")
    def validate_interval(self) -> "WorkInterval":
        start = _minute(self.start, allow_24=False)
        end = _minute(self.end, allow_24=True)
        if end <= start:
            raise ValueError("work interval end must be after start")
        return self


class WorkCalendarException(BaseModel):
    date: date
    intervals: list[WorkInterval] = Field(default_factory=list, max_length=24)

    @field_validator("intervals")
    @classmethod
    def validate_intervals(cls, value: list[WorkInterval]) -> list[WorkInterval]:
        _validate_non_overlapping(value)
        return value


def _validate_non_overlapping(intervals: list[WorkInterval]) -> None:
    previous_end = -1
    for interval in intervals:
        start = _minute(interval.start, allow_24=False)
        end = _minute(interval.end, allow_24=True)
        if start < previous_end:
            raise ValueError("work intervals must be ordered and cannot overlap")
        previous_end = end


def default_weekly_intervals() -> list[list[WorkInterval]]:
    return [[WorkInterval(start="00:00", end="24:00")] for _ in range(7)]


class ProjectWorkCalendarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    timezone: str = "UTC"
    weekly_intervals: list[list[WorkInterval]] = Field(
        default_factory=default_weekly_intervals,
        min_length=7,
        max_length=7,
    )
    exceptions: list[WorkCalendarException] = Field(default_factory=list)
    calendar_version: int = Field(default=1, ge=1)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectWorkCalendarUpdate(BaseModel):
    expected_version: int = Field(ge=1)
    timezone: str | None = Field(default=None, min_length=1, max_length=120)
    weekly_intervals: list[list[WorkInterval]] | None = Field(
        default=None,
        min_length=7,
        max_length=7,
    )
    exceptions: list[WorkCalendarException] | None = Field(default=None, max_length=3660)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("unknown work calendar IANA timezone") from exc
        return value

    @field_validator("weekly_intervals")
    @classmethod
    def validate_week(cls, value: list[list[WorkInterval]] | None) -> list[list[WorkInterval]] | None:
        if value is None:
            return None
        for intervals in value:
            if len(intervals) > 24:
                raise ValueError("a weekday can contain at most 24 work intervals")
            _validate_non_overlapping(intervals)
        return value

    @field_validator("exceptions")
    @classmethod
    def validate_exceptions(
        cls,
        value: list[WorkCalendarException] | None,
    ) -> list[WorkCalendarException] | None:
        if value is None:
            return None
        dates = [item.date for item in value]
        if len(dates) != len(set(dates)):
            raise ValueError("work calendar exceptions must use unique dates")
        return value

    @model_validator(mode="after")
    def require_change(self) -> "ProjectWorkCalendarUpdate":
        if not (self.model_fields_set - {"expected_version"}):
            raise ValueError("work calendar update must include at least one field")
        return self
