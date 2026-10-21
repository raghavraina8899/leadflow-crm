export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES = {
  name: ['name', 'full name', 'contact', 'contact name', 'lead', 'lead name'],
  company: ['company', 'organisation', 'organization', 'account', 'business'],
  job_title: ['job title', 'title', 'designation', 'role'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'contact number'],
  website: ['website', 'url', 'site'],
  city: ['city', 'location'],
  source: ['source', 'lead source', 'channel'],
  status: ['status', 'stage'],
  priority: ['priority'],
  value: ['value', 'deal value', 'amount', 'deal size'],
  expected_close: ['expected close', 'close date', 'expected close date'],
  tags: ['tags', 'labels'],
  notes: ['notes', 'description', 'comments'],
};

const STATUS_ALIASES = { won: 'converted', closed: 'converted', 'closed won': 'converted', 'closed lost': 'lost' };

export function mapLeadRows(rows) {
  const [header, ...body] = rows;
  const columns = header.map((h) => {
    const key = h.trim().toLowerCase();
    return Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(key))?.[0] ?? null;
  });

  const leads = body.map((cells) => {
    const lead = {};
    columns.forEach((field, i) => {
      if (!field) return;
      const value = (cells[i] ?? '').trim();
      if (value) lead[field] = value;
    });
    if (lead.status) lead.status = STATUS_ALIASES[lead.status.toLowerCase()] ?? lead.status.toLowerCase();
    if (lead.priority) lead.priority = lead.priority.toLowerCase();
    if (lead.value) lead.value = lead.value.replace(/[^\d.]/g, '');
    return lead;
  });

  return { leads, matched: columns.filter(Boolean), unmatched: header.filter((_, i) => !columns[i]) };
}

export const SAMPLE_CSV = [
  'Name,Company,Email,Phone,Source,Status,Priority,Deal value,Tags',
  'Ritu Bansal,Bansal Exports,ritu@bansalexports.in,+91 98200 12345,Website,new,high,150000,"inbound, smb"',
  'Mark Ellis,Ellis & Co,mark@ellisco.com,+44 20 7000 1234,Referral,contacted,medium,320000,enterprise',
].join('\n');
