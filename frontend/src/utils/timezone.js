/**
 * All booking times are displayed and stored in Eastern Canadian Time
 * (America/Toronto — EDT UTC-4 in summer, EST UTC-5 in winter).
 * The Intl API handles DST transitions automatically.
 */

const TZ = 'America/Toronto';

/**
 * Returns how many hours to ADD to an Eastern Time hour to get UTC.
 * e.g. EDT (UTC-4) → +4, EST (UTC-5) → +5
 */
const getETtoUTCOffset = (dateStr) => {
  // Sample noon UTC on that date; compare with what ET displays
  const sampleUTC = new Date(dateStr + 'T12:00:00Z');
  const etNoonHour = parseInt(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: '2-digit', hour12: false })
      .format(sampleUTC),
    10
  );
  return 12 - etNoonHour; // e.g. 12 - 8 = 4 (EDT), 12 - 7 = 5 (EST)
};

/**
 * Convert an Eastern Time slot hour on a given date to a UTC ISO string.
 * e.g. etHourToUTCISO("2026-04-24", 8) → "2026-04-24T12:00:00.000Z"
 */
export const etHourToUTCISO = (dateStr, etHour) => {
  const offset = getETtoUTCOffset(dateStr);
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCHours(etHour + offset, 0, 0, 0);
  return d.toISOString();
};

/** Format a date/ISO string as a time in Eastern Canada: "8:00 AM" */
export const formatTimeET = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(date));

/** Format a date/ISO string as a date in Eastern Canada: "Thu, Apr 24, 2026" */
export const formatDateET = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));

/** Format as full date+time: "Thu, Apr 24, 2026, 8:00 AM EDT" */
export const formatDateTimeET = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).format(new Date(date));

/** Format as short date+time without TZ label: "Apr 24, 8:00 AM" */
export const formatShortDateTimeET = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(date));

/** Get the date string (yyyy-MM-dd) in Eastern Time for a UTC date */
export const getETDateStr = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(date)).replace(/\//g, '-'); // en-CA uses YYYY-MM-DD

/** Check if two UTC dates fall on the same Eastern calendar day */
export const isSameDayET = (a, b) => getETDateStr(a) === getETDateStr(b);

/** Format as "Apr 24" in Eastern Time */
export const formatMonthDayET = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, month: 'short', day: 'numeric',
  }).format(new Date(date));
