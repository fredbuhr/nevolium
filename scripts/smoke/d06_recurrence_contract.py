#!/usr/bin/env python3
"""Pure contract for bounded D06 recurrence expansion and timezone semantics."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from nevolium_core.planning_recurrence import expand_recurrence, parse_recurrence_rule


PARIS = ZoneInfo("Europe/Paris")


def expect_invalid(raw: str) -> None:
    try:
        parse_recurrence_rule(raw)
    except ValueError:
        return
    raise AssertionError(f"expected invalid recurrence rule: {raw}")


def main() -> int:
    daily = parse_recurrence_rule("RRULE:FREQ=DAILY;COUNT=3")
    assert daily.frequency == "DAILY" and daily.count == 3 and daily.interval == 1
    expect_invalid("FREQ=YEARLY")
    expect_invalid("FREQ=DAILY;COUNT=2;UNTIL=20260930")
    expect_invalid("FREQ=DAILY;BYDAY=MO")
    expect_invalid("FREQ=MONTHLY;BYMONTHDAY=0")
    expect_invalid("FREQ=WEEKLY;BYDAY=MO,MO")

    # Spring DST: 2026-03-29 02:30 does not exist in Europe/Paris. The recurrence keeps wall-clock
    # intent deterministically by normalizing that occurrence through the real UTC round-trip.
    dst_occurrences = expand_recurrence(
        rule=daily,
        anchor_start=datetime(2026, 3, 28, 2, 30, tzinfo=PARIS),
        anchor_end=datetime(2026, 3, 28, 3, 0, tzinfo=PARIS),
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 3, 28, 0, 0, tzinfo=UTC),
        window_end=datetime(2026, 3, 31, 0, 0, tzinfo=UTC),
        include_anchor=True,
    )
    assert [item.number for item in dst_occurrences] == [1, 2, 3]
    assert [item.start_at for item in dst_occurrences] == [
        datetime(2026, 3, 28, 1, 30, tzinfo=UTC),
        datetime(2026, 3, 29, 1, 30, tzinfo=UTC),
        datetime(2026, 3, 30, 0, 30, tzinfo=UTC),
    ]
    assert dst_occurrences[1].start_at.astimezone(PARIS).hour == 3
    assert dst_occurrences[2].start_at.astimezone(PARIS).hour == 2

    weekly = parse_recurrence_rule("FREQ=WEEKLY;COUNT=4;BYDAY=MO,WE")
    weekly_occurrences = expand_recurrence(
        rule=weekly,
        anchor_start=datetime(2026, 9, 14, 9, 0, tzinfo=PARIS),
        anchor_end=None,
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 9, 14, 0, 0, tzinfo=UTC),
        window_end=datetime(2026, 9, 25, 0, 0, tzinfo=UTC),
        include_anchor=True,
    )
    assert [item.start_at.astimezone(PARIS).date().isoformat() for item in weekly_occurrences] == [
        "2026-09-14",
        "2026-09-16",
        "2026-09-21",
        "2026-09-23",
    ]

    monthly = parse_recurrence_rule("FREQ=MONTHLY;COUNT=4;BYMONTHDAY=31")
    monthly_occurrences = expand_recurrence(
        rule=monthly,
        anchor_start=datetime(2026, 1, 31, 10, 0, tzinfo=PARIS),
        anchor_end=None,
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, 0, 0, tzinfo=UTC),
        include_anchor=True,
    )
    assert [item.start_at.astimezone(PARIS).date().isoformat() for item in monthly_occurrences] == [
        "2026-01-31",
        "2026-03-31",
        "2026-05-31",
        "2026-07-31",
    ]

    sparse = parse_recurrence_rule("FREQ=MONTHLY;INTERVAL=12;BYMONTHDAY=31")
    sparse_occurrences = expand_recurrence(
        rule=sparse,
        anchor_start=datetime(2026, 4, 30, 9, 0, tzinfo=PARIS),
        anchor_end=None,
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 4, 1, 0, 0, tzinfo=UTC),
        window_end=datetime(2031, 5, 1, 0, 0, tzinfo=UTC),
        include_anchor=False,
    )
    assert sparse_occurrences == []

    until = parse_recurrence_rule("FREQ=DAILY;UNTIL=20260917")
    until_occurrences = expand_recurrence(
        rule=until,
        anchor_start=datetime(2026, 9, 15, 8, 0, tzinfo=PARIS),
        anchor_end=None,
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 9, 15, 0, 0, tzinfo=UTC),
        window_end=datetime(2026, 9, 20, 0, 0, tzinfo=UTC),
        include_anchor=True,
    )
    assert [item.start_at.astimezone(PARIS).date().isoformat() for item in until_occurrences] == [
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
    ]

    # Pure expansion is idempotent: the same inputs produce byte-for-byte equivalent value tuples
    # and never persist/materialize duplicate Task rows.
    repeated = expand_recurrence(
        rule=weekly,
        anchor_start=datetime(2026, 9, 14, 9, 0, tzinfo=PARIS),
        anchor_end=None,
        anchor_due=None,
        timezone_name="Europe/Paris",
        window_start=datetime(2026, 9, 14, 0, 0, tzinfo=UTC),
        window_end=datetime(2026, 9, 25, 0, 0, tzinfo=UTC),
        include_anchor=True,
    )
    assert repeated == weekly_occurrences

    print(
        "D06 RECURRENCE PASS: strict bounded DAILY/WEEKLY/MONTHLY rules, COUNT/UNTIL, BYDAY/"
        "BYMONTHDAY, sparse-month termination, Europe/Paris DST normalization and idempotent "
        "virtual occurrence expansion hold"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
