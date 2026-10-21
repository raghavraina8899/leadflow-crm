const DAY = 86400000;

export function startOfWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY);
}

export function weekBuckets(weeks) {
  const current = startOfWeek(new Date());
  return Array.from({ length: weeks }, (_, i) => new Date(current.getTime() - (weeks - 1 - i) * 7 * DAY));
}

export function monthBuckets(months) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export function countByWeek(buckets, dates) {
  const counts = new Map(buckets.map((b) => [b.getTime(), 0]));
  for (const date of dates) {
    const key = startOfWeek(new Date(date)).getTime();
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return buckets.map((b) => counts.get(b.getTime()));
}

export const isoDate = (d) => d.toISOString().slice(0, 10);
