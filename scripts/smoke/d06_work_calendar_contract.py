#!/usr/bin/env python3
"""Pure D06 contract for project work calendars and DST-safe capacity."""

from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from nevolium_core.planning_work_calendar import (
    add_working_seconds,
    build_work_calendar,
    working_seconds_between,
)
from nevolium_core.planning_work_calendar_schemas import (
    ProjectWorkCalendarUpdate,
    WorkCalendarException,
    WorkInterval,
    default_weekly_intervals,
)

PARIS = ZoneInfo("Europe/Paris")


def main() -> int:
    try:
        WorkInterval(start="12:00", end="11:00")
    except ValidationError:
        pass
    else:
        raise AssertionError("backwards work interval passed validation")

    try:
        ProjectWorkCalendarUpdate(expected_version=1, timezone=None)
    except ValidationError:
        pass
    else:
        raise AssertionError("explicit null work calendar field passed validation")

    try:
        ProjectWorkCalendarUpdate(
            expected_version=1,
            timezone="Mars/Olympus",
        )
    except ValidationError:
        pass
    else:
        raise AssertionError("unknown IANA timezone passed work calendar validation")

    try:
        ProjectWorkCalendarUpdate(
            expected_version=1,
            weekly_intervals=[
                [WorkInterval(start="09:00", end="12:00"), WorkInterval(start="11:00", end="13:00")],
                [], [], [], [], [], [],
            ],
        )
    except ValidationError:
        pass
    else:
        raise AssertionError("overlapping work intervals passed validation")

    always = build_work_calendar(
        timezone_name="Europe/Paris",
        weekly_intervals=default_weekly_intervals(),
        exceptions=[],
    )
    spring_start = datetime(2026, 3, 29, 0, 0, tzinfo=PARIS)
    spring_end = datetime(2026, 3, 30, 0, 0, tzinfo=PARIS)
    assert working_seconds_between(spring_start, spring_end, always) == 23 * 3600
    assert add_working_seconds(spring_start, 24 * 3600, always) == datetime(
        2026, 3, 30, 1, 0, tzinfo=PARIS
    )

    autumn_start = datetime(2026, 10, 25, 0, 0, tzinfo=PARIS)
    autumn_end = datetime(2026, 10, 26, 0, 0, tzinfo=PARIS)
    assert working_seconds_between(autumn_start, autumn_end, always) == 25 * 3600

    office_week = [
        [WorkInterval(start="09:00", end="12:00"), WorkInterval(start="13:00", end="17:00")]
        for _ in range(5)
    ] + [[], []]
    office = build_work_calendar(
        timezone_name="Europe/Paris",
        weekly_intervals=office_week,
        exceptions=[WorkCalendarException(date=date(2026, 9, 16), intervals=[])],
    )
    monday = datetime(2026, 9, 14, 8, 0, tzinfo=PARIS)
    monday_end = datetime(2026, 9, 14, 18, 0, tzinfo=PARIS)
    assert working_seconds_between(monday, monday_end, office) == 7 * 3600

    # From Monday 10:00, eight working hours consume six hours on Monday, two on Tuesday.
    assert add_working_seconds(
        datetime(2026, 9, 14, 10, 0, tzinfo=PARIS),
        8 * 3600,
        office,
    ) == datetime(2026, 9, 15, 11, 0, tzinfo=PARIS)

    # Wednesday is a full holiday override, so capacity resumes Thursday morning.
    assert add_working_seconds(
        datetime(2026, 9, 15, 16, 0, tzinfo=PARIS),
        2 * 3600,
        office,
    ) == datetime(2026, 9, 17, 10, 0, tzinfo=PARIS)

    # UTC input remains equivalent to local input and output preserves the caller timezone.
    utc_result = add_working_seconds(
        datetime(2026, 9, 15, 14, 0, tzinfo=UTC),
        2 * 3600,
        office,
    )
    assert utc_result == datetime(2026, 9, 17, 8, 0, tzinfo=UTC)

    print(
        "D06 WORK CALENDAR PASS: validated non-null weekly intervals/exceptions, 24/7 default, "
        "split office hours, holiday overrides, work-duration addition and Europe/Paris 23h/25h "
        "DST days hold"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
