from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Iterator, Literal
from zoneinfo import ZoneInfo


RecurrenceFrequency = Literal["DAILY", "WEEKLY", "MONTHLY"]
WEEKDAYS = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
MAX_RECURRENCE_COUNT = 10_000
MAX_RECURRENCE_SCAN = 100_000


@dataclass(frozen=True, slots=True)
class ParsedRecurrenceRule:
    frequency: RecurrenceFrequency
    interval: int = 1
    count: int | None = None
    until: datetime | date | None = None
    byday: tuple[int, ...] = ()
    bymonthday: tuple[int, ...] = ()


@dataclass(frozen=True, slots=True)
class RecurrenceOccurrence:
    number: int
    start_at: datetime
    end_at: datetime | None
    due_at: datetime | None


def _positive_int(raw: str, *, field: str, maximum: int) -> int:
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{field} must be an integer") from exc
    if not 1 <= value <= maximum:
        raise ValueError(f"{field} must be between 1 and {maximum}")
    return value


def _parse_until(raw: str) -> datetime | date:
    if len(raw) == 8 and raw.isdigit():
        try:
            return datetime.strptime(raw, "%Y%m%d").date()
        except ValueError as exc:
            raise ValueError("UNTIL date is invalid") from exc
    if len(raw) == 16 and raw.endswith("Z"):
        try:
            return datetime.strptime(raw, "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC)
        except ValueError as exc:
            raise ValueError("UNTIL UTC timestamp is invalid") from exc
    raise ValueError("UNTIL must use YYYYMMDD or YYYYMMDDTHHMMSSZ")


def parse_recurrence_rule(raw: str) -> ParsedRecurrenceRule:
    text = raw.strip()
    if text.upper().startswith("RRULE:"):
        text = text[6:]
    if not text:
        raise ValueError("recurrence rule is empty")

    parts: dict[str, str] = {}
    for token in text.split(";"):
        if "=" not in token:
            raise ValueError("recurrence rule tokens must use KEY=VALUE")
        key, value = token.split("=", 1)
        key = key.strip().upper()
        value = value.strip().upper()
        if not key or not value:
            raise ValueError("recurrence rule tokens cannot be empty")
        if key in parts:
            raise ValueError(f"duplicate recurrence field: {key}")
        parts[key] = value

    allowed = {"FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY"}
    unsupported = sorted(set(parts) - allowed)
    if unsupported:
        raise ValueError(f"unsupported recurrence field: {unsupported[0]}")

    frequency = parts.get("FREQ")
    if frequency not in {"DAILY", "WEEKLY", "MONTHLY"}:
        raise ValueError("FREQ must be DAILY, WEEKLY or MONTHLY")

    interval = _positive_int(parts.get("INTERVAL", "1"), field="INTERVAL", maximum=366)
    count = None
    if "COUNT" in parts:
        count = _positive_int(parts["COUNT"], field="COUNT", maximum=MAX_RECURRENCE_COUNT)
    until = _parse_until(parts["UNTIL"]) if "UNTIL" in parts else None
    if count is not None and until is not None:
        raise ValueError("COUNT and UNTIL cannot be combined")

    byday: tuple[int, ...] = ()
    if "BYDAY" in parts:
        if frequency != "WEEKLY":
            raise ValueError("BYDAY is supported only with WEEKLY recurrence")
        tokens = parts["BYDAY"].split(",")
        try:
            values = [WEEKDAYS[token] for token in tokens]
        except KeyError as exc:
            raise ValueError("BYDAY accepts MO,TU,WE,TH,FR,SA,SU") from exc
        if len(values) != len(set(values)):
            raise ValueError("BYDAY cannot contain duplicate weekdays")
        byday = tuple(sorted(values))

    bymonthday: tuple[int, ...] = ()
    if "BYMONTHDAY" in parts:
        if frequency != "MONTHLY":
            raise ValueError("BYMONTHDAY is supported only with MONTHLY recurrence")
        values = [
            _positive_int(token, field="BYMONTHDAY", maximum=31)
            for token in parts["BYMONTHDAY"].split(",")
        ]
        if len(values) != len(set(values)):
            raise ValueError("BYMONTHDAY cannot contain duplicate days")
        bymonthday = tuple(sorted(values))

    return ParsedRecurrenceRule(
        frequency=frequency,
        interval=interval,
        count=count,
        until=until,
        byday=byday,
        bymonthday=bymonthday,
    )


def _normalize_wall_time(day: date, source_time: time, zone: ZoneInfo) -> datetime:
    naive = datetime.combine(day, source_time.replace(tzinfo=None))
    candidate = naive.replace(tzinfo=zone, fold=0)
    roundtrip = candidate.astimezone(UTC).astimezone(zone)
    # ZoneInfo permits construction of a nonexistent spring-forward time. Normalize it by the
    # actual UTC round-trip, which moves the occurrence forward by the DST gap deterministically.
    if roundtrip.replace(tzinfo=None) != naive:
        return roundtrip
    return candidate


def _month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1


def _allowed_by_until(candidate: datetime, until: datetime | date | None) -> bool:
    if until is None:
        return True
    if isinstance(until, datetime):
        return candidate.astimezone(UTC) <= until
    return candidate.date() <= until


def _candidate_starts(
    rule: ParsedRecurrenceRule,
    anchor: datetime,
    *,
    stop_before: datetime,
) -> Iterator[tuple[int, datetime]]:
    zone = anchor.tzinfo
    if not isinstance(zone, ZoneInfo):
        raise ValueError("recurrence anchor must use an IANA ZoneInfo timezone")
    source_time = anchor.timetz().replace(tzinfo=None)
    stop_local = stop_before.astimezone(zone)
    emitted = 0
    scanned = 0

    def accept(candidate: datetime) -> tuple[int, datetime] | None:
        nonlocal emitted, scanned
        scanned += 1
        if scanned > MAX_RECURRENCE_SCAN:
            raise ValueError("recurrence expansion exceeded the scan bound")
        if candidate.astimezone(UTC) >= stop_before.astimezone(UTC):
            return None
        if not _allowed_by_until(candidate, rule.until):
            return None
        if rule.count is not None and emitted >= rule.count:
            return None
        emitted += 1
        return emitted, candidate

    first = accept(anchor)
    if first is not None:
        yield first
    if rule.count is not None and emitted >= rule.count:
        return

    if rule.frequency == "DAILY":
        step = 1
        while True:
            candidate = _normalize_wall_time(
                anchor.date() + timedelta(days=step * rule.interval),
                source_time,
                zone,
            )
            if candidate.astimezone(UTC) >= stop_before.astimezone(UTC):
                return
            accepted = accept(candidate)
            if accepted is None:
                return
            yield accepted
            if rule.count is not None and emitted >= rule.count:
                return
            step += 1

    if rule.frequency == "WEEKLY":
        weekdays = rule.byday or (anchor.weekday(),)
        monday = anchor.date() - timedelta(days=anchor.weekday())
        week_index = 0
        while True:
            week_start = monday + timedelta(weeks=week_index * rule.interval)
            period_candidates = [
                _normalize_wall_time(week_start + timedelta(days=weekday), source_time, zone)
                for weekday in weekdays
            ]
            period_candidates = [candidate for candidate in period_candidates if candidate > anchor]
            if period_candidates and min(period_candidates).astimezone(UTC) >= stop_before.astimezone(UTC):
                return
            for candidate in period_candidates:
                if candidate.astimezone(UTC) >= stop_before.astimezone(UTC):
                    return
                accepted = accept(candidate)
                if accepted is None:
                    return
                yield accepted
                if rule.count is not None and emitted >= rule.count:
                    return
            week_index += 1

    if rule.frequency == "MONTHLY":
        monthdays = rule.bymonthday or (anchor.day,)
        month_index = 0
        while True:
            year, month = _month(anchor.year, anchor.month, month_index * rule.interval)
            # Sparse BYMONTHDAY rules can produce empty periods (for example day 31 in February).
            # Bound those empty periods by the requested expansion window rather than relying on
            # accepted-candidate counting, so a rule can never scan forever without yielding.
            if (year, month) > (stop_local.year, stop_local.month):
                return
            if month_index > MAX_RECURRENCE_SCAN:
                raise ValueError("recurrence expansion exceeded the scan bound")
            max_day = monthrange(year, month)[1]
            period_candidates = [
                _normalize_wall_time(date(year, month, day), source_time, zone)
                for day in monthdays
                if day <= max_day
            ]
            period_candidates = [candidate for candidate in period_candidates if candidate > anchor]
            if period_candidates and min(period_candidates).astimezone(UTC) >= stop_before.astimezone(UTC):
                return
            for candidate in period_candidates:
                if candidate.astimezone(UTC) >= stop_before.astimezone(UTC):
                    return
                accepted = accept(candidate)
                if accepted is None:
                    return
                yield accepted
                if rule.count is not None and emitted >= rule.count:
                    return
            month_index += 1


def expand_recurrence(
    *,
    rule: ParsedRecurrenceRule,
    anchor_start: datetime,
    anchor_end: datetime | None,
    anchor_due: datetime | None,
    timezone_name: str,
    window_start: datetime,
    window_end: datetime,
    include_anchor: bool = False,
) -> list[RecurrenceOccurrence]:
    for value, name in (
        (anchor_start, "anchor_start"),
        (window_start, "window_start"),
        (window_end, "window_end"),
    ):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError(f"{name} must be timezone-aware")
    if window_end <= window_start:
        raise ValueError("window_end must be after window_start")
    if anchor_end is not None and (anchor_end.tzinfo is None or anchor_end.utcoffset() is None):
        raise ValueError("anchor_end must be timezone-aware")
    if anchor_due is not None and (anchor_due.tzinfo is None or anchor_due.utcoffset() is None):
        raise ValueError("anchor_due must be timezone-aware")
    if anchor_end is not None and anchor_end < anchor_start:
        raise ValueError("anchor_end must be on or after anchor_start")

    zone = ZoneInfo(timezone_name)
    local_anchor = anchor_start.astimezone(zone)
    duration = anchor_end - anchor_start if anchor_end is not None else None
    due_offset = anchor_due - anchor_start if anchor_due is not None else None
    result: list[RecurrenceOccurrence] = []

    for number, local_start in _candidate_starts(rule, local_anchor, stop_before=window_end):
        if number == 1 and not include_anchor:
            continue
        start_at = local_start.astimezone(UTC)
        end_at = start_at + duration if duration is not None else None
        due_at = start_at + due_offset if due_offset is not None else None
        point_in_window = end_at is None or end_at == start_at
        overlaps = (
            window_start <= start_at < window_end
            if point_in_window
            else start_at < window_end and end_at > window_start
        )
        due_in_window = due_at is not None and window_start <= due_at < window_end
        if overlaps or due_in_window:
            result.append(
                RecurrenceOccurrence(
                    number=number,
                    start_at=start_at,
                    end_at=end_at,
                    due_at=due_at,
                )
            )
    return result
