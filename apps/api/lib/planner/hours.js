/**
 * Opening hours, stored as `radno_vreme` JSON:
 *
 *   { "pon": [["08:00", "23:00"]], "sub": [["10:00", "14:00"], ["18:00", "02:00"]], "ned": [] }
 *
 * An empty list is a closed day. An interval whose end is not after its start
 * runs past midnight ("18:00"–"02:00"). A missing day or a NULL column means
 * the hours are unknown, which is not the same as closed.
 */
const { dayKey, previousDayKey, toMinutes, DAY_KEYS } = require('./time');

/** Parsed hours, or null when the value is missing or malformed. */
function parseHours(value) {
  if (value === null || value === undefined || value === '') return null;
  let data = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const hours = {};
  for (const key of Object.keys(data)) {
    if (!DAY_KEYS.includes(key) || !Array.isArray(data[key])) return null;
    const intervals = [];
    for (const interval of data[key]) {
      if (!Array.isArray(interval) || interval.length !== 2) return null;
      const [open, close] = interval.map(toMinutes);
      if (open === null || close === null) return null;
      intervals.push([open, close]);
    }
    hours[key] = intervals;
  }
  return hours;
}

/** true / false, or null when that day's hours are unknown. */
function isOpenOn(hours, date) {
  if (!hours) return null;
  const intervals = hours[dayKey(date)];
  return intervals === undefined ? null : intervals.length > 0;
}

/** Whether the place is open at 'HH:MM' on `date`; null when unknown. */
function isOpenAt(hours, date, time) {
  if (!hours) return null;
  const minute = toMinutes(time);
  const today = hours[dayKey(date)];
  const yesterday = hours[previousDayKey(dayKey(date))];
  if (today === undefined) return null;

  const openToday = today.some(([open, close]) =>
    close > open ? minute >= open && minute < close : minute >= open,
  );
  const openFromYesterday = (yesterday || []).some(([open, close]) => close <= open && minute < close);
  return openToday || openFromYesterday;
}

/** "08:00-23:00" / "zatvoreno" / "?" for the candidate line of that date. */
function hoursLabel(hours, date) {
  if (!hours) return '?';
  const intervals = hours[dayKey(date)];
  if (intervals === undefined) return '?';
  if (!intervals.length) return 'zatvoreno';
  const pad = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return intervals.map(([open, close]) => `${pad(open)}-${pad(close)}`).join(',');
}

module.exports = { parseHours, isOpenOn, isOpenAt, hoursLabel };
