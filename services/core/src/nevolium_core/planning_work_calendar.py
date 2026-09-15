from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .planning_work_calendar_schemas import WorkCalendarException, WorkInterval

MAX_WORK_CALENDAR_SCAN_DAYS = 3660


@dataclass(frozen=True, slots=True)
class WorkCalendarDefinition:
    timezone: ZoneInfo
    weekly_intervals: tuple[tuple[tuple[int, int], ...], ...]
    exceptions: dict[date, tuple[tuple[int, int], ...]]


def _minute(value: str, *, allow_24: bool) -> int:
    hour = int(value[:2])
    minute = int(value[3:])
    if hour == 24 and minute == 0 and allow_24:
        return 1440
    return hour * 60 + minute


def build_work_calendar(
    *,
    timezone_name: str,
    weekly_intervals: list[list[WorkInterval]],
    exceptions: list[WorkCalendarException],
) -> WorkCalendarDefinition:
    if len(weekly_intervals) != 7:
        raise ValueError("work calendar must contain exactly seven weekdays")
    zone = ZoneInfo(timezone_name)
    week = tuple(
        tuple(
            (_minute(interval.start, allow_24=False), _minute(interval.end, allow_24=True))
            for interval in intervals
        )
        for intervals in weekly_intervals
    )
    overrides = {
        item.date: tuple(
            (_minute(interval.start, allow_24=False), _minute(interval.end, allow_24=True))
            for interval in item.intervals
        )
        for item in exceptions
    }
    return WorkCalendarDefinition(timezone=zone, weekly_intervals=week, exceptions=overrides)


def _local_boundary(day: date, minute: int, zone: ZoneInfo, *, end: bool) -> datetime:
    if minute == 1440:
        return datetime.combine(day + timedelta(days=1), time.min, tzinfo=zone)
    naive = datetime.combine(day, time(hour=minute // 60, minute=minute % 60))
    fold0 = naive.replace(tzinfo=zone, fold=0)
    fold1 = naive.replace(tzinfo=zone, fold=1)
    roundtrip0 = fold0.astimezone(UTC).astimezone(zone)
    roundtrip1 = fold1.astimezone(UTC).astimezone(zone)
    valid0 = roundtrip0.replace(tzinfo=None) == naive
    valid1 = roundtrip1.replace(tzinfo=None) == naive
    if not valid0 and not valid1:
        # Nonexistent spring-forward wall time: move to the first real instant represented by the
        # ZoneInfo UTC round-trip. Both interval boundaries normalize deterministically forward.
        return roundtrip0
    if valid0 and valid1 and fold0.utcoffset() != fold1.utcoffset():
        # Ambiguous fall-back wall time: start at the first occurrence and end at the second so a
        # work interval spanning the repeated hour includes the complete elapsed working period.
        return fold1 if end else fold0
    return fold0 if valid0 else fold1


def work_intervals_for_date(
    calendar: WorkCalendarDefinition,
    day: date,
) -> tuple[tuple[datetime, datetime], ...]:
    minute_intervals = calendar.exceptions.get(day, calendar.weekly_intervals[day.weekday()])
    result: list[tuple[datetime, datetime]] = []
    for start_minute, end_minute in minute_intervals:
        start = _local_boundary(day, start_minute, calendar.timezone, end=False)
        end = _local_boundary(day, end_minute, calendar.timezone, end=True)
        if end.astimezone(UTC) > start.astimezone(UTC):
            result.append((start, end))
    return tuple(result)


def working_seconds_between(
    start: datetime,
    end: datetime,
    calendar: WorkCalendarDefinition,
) -> int:
    if start.tzinfo is None or start.utcoffset() is None or end.tzinfo is None or end.utcoffset() is None:
        raise ValueError("work calendar timestamps must be timezone-aware")
    start_utc = start.astimezone(UTC)
    end_utc = end.astimezone(UTC)
    if end_utc < start_utc:
        raise ValueError("work calendar end must be on or after start")
    if end_utc == start_utc:
        return 0

    local_start = start_utc.astimezone(calendar.timezone).date()
    local_end = end_utc.astimezone(calendar.timezone).date()
    total = 0.0
    day = local_start
    scanned = 0
    while day <= local_end:
        scanned += 1
        if scanned > MAX_WORK_CALENDAR_SCAN_DAYS:
            raise ValueError("work calendar calculation exceeded the day bound")
        for interval_start, interval_end in work_intervals_for_date(calendar, day):
            clipped_start = max(start_utc, interval_start.astimezone(UTC))
            clipped_end = min(end_utc, interval_end.astimezone(UTC))
            if clipped_end > clipped_start:
                total += (clipped_end - clipped_start).total_seconds()
        day += timedelta(days=1)
    return int(total)


def add_working_seconds(
    start: datetime,
    seconds: int,
    calendar: WorkCalendarDefinition,
) -> datetime:
    if start.tzinfo is None or start.utcoffset() is None:
        raise ValueError("work calendar start must be timezone-aware")
    if seconds < 0:
        raise ValueError("working seconds cannot be negative")
    if seconds == 0:
        return start

    cursor = start.astimezone(UTC)
    day = cursor.astimezone(calendar.timezone).date()
    remaining = seconds
    scanned = 0
    while scanned < MAX_WORK_CALENDAR_SCAN_DAYS:
        scanned += 1
        for interval_start, interval_end in work_intervals_for_date(calendar, day):
            interval_start_utc = interval_start.astimezone(UTC)
            interval_end_utc = interval_end.astimezone(UTC)
            available_start = max(cursor, interval_start_utc)
            if interval_end_utc <= available_start:
                continue
            available = int((interval_end_utc - available_start).total_seconds())
            if remaining <= available:
                return (available_start + timedelta(seconds=remaining)).astimezone(start.tzinfo)
            remaining -= available
            cursor = interval_end_utc
        day += timedelta(days=1)
        cursor = datetime.combine(day, time.min, tzinfo=calendar.timezone).astimezone(UTC)
    raise ValueError("work calendar contains no reachable capacity within the scan bound")
