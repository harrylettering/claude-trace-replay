/**
 * Log timestamps are UTC ISO strings (`…Z`). Views show them in the viewer's
 * local zone, which is right for reading but leaves two things implicit: which
 * zone that is, and which day a bare `22:43:56` falls on. These helpers make
 * both explicit, and keep the clock independent of the browser locale — en-US
 * prints `10:43:56 PM` where zh-CN prints `22:43:56` for the same entry.
 */

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

function toDate(timestamp: string | number | undefined): Date | null {
  if (timestamp === undefined || timestamp === '') return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `UTC+8`, `UTC-3:30`, `UTC` — the offset in effect at that instant, so DST is honoured. */
export function utcOffsetLabel(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${rest ? `:${pad(rest)}` : ''}`;
}

/** `Asia/Shanghai (UTC+8)`, using the offset at `timestamp` (or now). */
export function describeLocalZone(timestamp?: string | number): string {
  const date = toDate(timestamp) ?? new Date();
  let name: string | undefined;
  try {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    name = undefined;
  }
  const offset = utcOffsetLabel(date);
  return name && name !== 'UTC' && name !== 'Etc/UTC' ? `${name} (${offset})` : offset;
}

/** Local calendar day, `YYYY-MM-DD`. */
export function localDayKey(timestamp: string | number | undefined): string | null {
  const date = toDate(timestamp);
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True when the timestamps land on more than one local calendar day. */
export function spansMultipleLocalDays(timestamps: Iterable<string | number | undefined>): boolean {
  let first: string | null = null;
  for (const timestamp of timestamps) {
    const day = localDayKey(timestamp);
    if (day === null) continue;
    if (first === null) first = day;
    else if (day !== first) return true;
  }
  return false;
}

/**
 * Local time for a row: `22:43:56`, or `08-22 22:43:56` when the session
 * crosses midnight and the time alone would be ambiguous. `—` for a missing or
 * unparseable timestamp rather than `Invalid Date`.
 */
export function formatLocalTime(
  timestamp: string | number | undefined,
  options: { withDate?: boolean } = {}
): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return options.withDate ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}` : clock;
}

/**
 * Hover text: the full local time with its zone, plus the raw value exactly as
 * written in the log, so a row can be found in the jsonl with a text search.
 */
export function formatTimestampTooltip(timestamp: string | number | undefined): string | undefined {
  const date = toDate(timestamp);
  if (!date) return undefined;
  const local = `${localDayKey(timestamp)} ${formatLocalTime(timestamp)}.${pad(date.getMilliseconds(), 3)}`;
  const raw = typeof timestamp === 'string' ? timestamp : date.toISOString();
  return `Local: ${local} ${describeLocalZone(timestamp)}\nIn log (UTC): ${raw}`;
}
