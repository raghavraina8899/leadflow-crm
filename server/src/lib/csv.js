const needsQuoting = /[",\n\r]/;

function cell(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join(', ') : String(value);
  const safe = /^[=@\t\r]|^[+-](?![\d\s(])/.test(text) ? `'${text}` : text;
  return needsQuoting.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(','));
  return [header, ...body].join('\r\n');
}
