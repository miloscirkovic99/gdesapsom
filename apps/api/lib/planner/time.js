/**
 * Europe/Belgrade calendar arithmetic without Intl, which the MARS runtime
 * is not known to have. Serbia follows the EU rule: summer time (UTC+2) from
 * the last Sunday of March to the last Sunday of October, 01:00 UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEYS = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];

function lastSundayAt0100Utc(year, month) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), 1, 0, 0);
}

/** Minutes Belgrade is ahead of UTC at the instant `ms`. */
function belgradeOffsetMinutes(ms) {
  const year = new Date(ms).getUTCFullYear();
  return ms >= lastSundayAt0100Utc(year, 2) && ms < lastSundayAt0100Utc(year, 9) ? 120 : 60;
}

const pad = (n) => String(n).padStart(2, '0');

/** Belgrade wall clock at `ms`: { date: 'YYYY-MM-DD', hour, minute }. */
function belgradeLocal(ms) {
  const local = new Date(ms + belgradeOffsetMinutes(ms) * 60000);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

function parseDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** UTC instant of 00:00 Belgrade time on `date`. */
function belgradeMidnightUtc(date) {
  const p = parseDate(date);
  if (!p) throw new Error(`Bad date ${date}`);
  const naive = Date.UTC(p.y, p.m - 1, p.d);
  return naive - belgradeOffsetMinutes(naive - 2 * 60 * 60000) * 60000;
}

/** Whole days from `from` to `to` ('YYYY-MM-DD'). */
function daysBetween(from, to) {
  const a = parseDate(from);
  const b = parseDate(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
}

/** 'pon' … 'ned' for a 'YYYY-MM-DD'. */
function dayKey(date) {
  const p = parseDate(date);
  return DAY_KEYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
}

function previousDayKey(key) {
  return DAY_KEYS[(DAY_KEYS.indexOf(key) + 6) % 7];
}

/** 'HH:MM' → minutes after midnight, or null. */
function toMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function fromMinutes(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

module.exports = {
  DAY_MS,
  DAY_KEYS,
  belgradeOffsetMinutes,
  belgradeLocal,
  belgradeMidnightUtc,
  parseDate,
  daysBetween,
  dayKey,
  previousDayKey,
  toMinutes,
  fromMinutes,
};
