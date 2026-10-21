import bcrypt from 'bcryptjs';

const DAY = 86400000;

function createRandom(seed) {
  let state = seed;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted: (entries) => {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    chance: (p) => next() < p,
  };
}

const USERS = [
  { name: 'Asha Verma', email: 'admin@crm.test', password: 'admin123', role: 'admin', title: 'Head of Sales' },
  { name: 'Priya Sharma', email: 'priya@crm.test', password: 'sales123', role: 'sales', title: 'Senior Account Executive' },
  { name: 'Arjun Mehta', email: 'arjun@crm.test', password: 'sales123', role: 'sales', title: 'Account Executive' },
  { name: 'Kavya Nair', email: 'kavya@crm.test', password: 'sales123', role: 'sales', title: 'Account Executive' },
  { name: 'Rahul Desai', email: 'rahul@crm.test', password: 'sales123', role: 'sales', title: 'Sales Development Rep' },
];

const FIRST = ['Rohan', 'Meera', 'David', 'Sara', 'Vikram', 'Emily', 'Karan', 'Ananya', 'Tom', 'Neha', 'Farhan', 'Lisa',
  'Aditya', 'Ishita', 'Michael', 'Zoya', 'Nikhil', 'Hannah', 'Siddharth', 'Riya', 'James', 'Pooja', 'Omar', 'Tanvi',
  'Daniel', 'Aisha', 'Kunal', 'Sophie', 'Varun', 'Nisha', 'Ethan', 'Divya', 'Raj', 'Grace', 'Manish', 'Leah'];
const LAST = ['Kapoor', 'Iyer', 'Chen', 'Ali', 'Rao', 'Park', 'Singh', 'Gupta', 'Walker', 'Joshi', 'Qureshi', 'Gomez',
  'Malhotra', 'Bose', 'Fernandes', 'Khan', 'Reddy', 'Müller', 'Patel', 'Thomas', 'Wright', 'Banerjee', 'Shah', 'Lee'];
const COMPANY_A = ['Northwind', 'BrightPath', 'Lumen', 'Kestrel', 'Bluefin', 'Sterling', 'Orchid', 'Vertex', 'Monsoon',
  'Cedar', 'Saffron', 'Zenith', 'Harbor', 'Indus', 'Nimbus', 'Granite', 'Pinnacle', 'Evergreen', 'Atlas', 'Aurora'];
const COMPANY_B = ['Labs', 'Health', 'Logistics', 'Retail', 'Foods', 'Pharma', 'Software', 'Motors', 'Interiors',
  'Textiles', 'Fintech', 'Hospitality', 'Realty', 'Analytics', 'Education', 'Energy'];
const TITLES = ['CEO', 'Founder', 'CTO', 'Head of Operations', 'Procurement Manager', 'IT Director', 'VP Sales',
  'Operations Manager', 'Finance Controller', 'Marketing Director'];
const CITIES = ['Mumbai', 'Bengaluru', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata', 'Dubai',
  'Singapore', 'London', 'San Francisco'];
const SOURCES = [['Website', 30], ['Referral', 20], ['LinkedIn', 18], ['Event', 10], ['Cold call', 10], ['Partner', 8], ['Google Ads', 12]];
const TAGS = ['enterprise', 'smb', 'renewal', 'partner', 'hot', 'inbound', 'outbound', 'q4-push', 'expansion'];
const LOST_REASONS = ['Went with a competitor', 'Budget not approved', 'No response', 'Timing — revisit next year', 'Price too high'];

const CALLS = ['Discovery call', 'Intro call', 'Pricing discussion', 'Check-in call', 'Call with procurement', 'Technical Q&A'];
const MEETINGS = ['Product demo', 'Requirements workshop', 'Stakeholder meeting', 'On-site visit', 'Proposal walkthrough'];
const EMAILS = ['Sent brochure', 'Shared case study', 'Sent proposal', 'Shared pricing sheet', 'Sent follow-up email'];
const NOTES = [
  'Decision maker is the CFO. Budget cycle starts next quarter.',
  'Currently using spreadsheets, wants a pilot for one team first.',
  'Asked for integration with their existing ERP.',
  'Very responsive. Strong fit for the annual plan.',
  'Comparing us with two other vendors.',
  'Needs approval from the regional head.',
];
const TASKS = ['Send revised quote', 'Schedule demo with IT team', 'Share security questionnaire', 'Follow up on proposal',
  'Confirm budget and timeline', 'Call back after board meeting', 'Send contract for signature', 'Check if pilot is approved'];

const STAGES = ['new', 'contacted', 'qualified', 'proposal'];

function businessHours(rand, timestamp, notBefore) {
  const d = new Date(timestamp);
  d.setHours(rand.int(9, 17), rand.pick([0, 30]), 0, 0);
  if (notBefore && d.getTime() < notBefore) d.setTime(notBefore + rand.int(1, 6) * 3600000);
  d.setMinutes(rand.pick([0, 30]), 0, 0);
  return d;
}

function buildLead(rand, now, index) {
  const ageDays = Math.floor(Math.pow(rand.next(), 1.6) * 180);
  const createdAt = new Date(now - ageDays * DAY - rand.int(0, 23) * 3600000);
  const first = rand.pick(FIRST);
  const last = rand.pick(LAST);
  const company = `${rand.pick(COMPANY_A)} ${rand.pick(COMPANY_B)}`;
  const domain = company.toLowerCase().replace(/[^a-z]+/g, '') + (rand.chance(0.6) ? '.com' : '.in');

  const closeChance = Math.min(0.85, ageDays / 120);
  let status;
  if (ageDays > 10 && rand.chance(closeChance)) status = rand.chance(0.58) ? 'converted' : 'lost';
  else status = STAGES[Math.min(3, Math.floor(rand.next() * Math.min(4, 1 + ageDays / 6)))];

  const priority = rand.weighted([['high', 25], ['medium', 50], ['low', 25]]);
  const value = rand.int(4, 120) * 5000;
  const tags = TAGS.filter(() => rand.chance(0.14)).slice(0, 3);
  if (value >= 300000 && !tags.includes('enterprise')) tags.push('enterprise');

  const closedAt = status === 'converted' || status === 'lost'
    ? new Date(Math.min(now - DAY, createdAt.getTime() + rand.int(6, 50) * DAY))
    : null;

  return {
    index,
    name: `${first} ${last}`,
    company,
    job_title: rand.pick(TITLES),
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}${index}@${domain}`,
    phone: `+91 9${rand.int(100000000, 999999999)}`,
    website: `https://${domain}`,
    city: rand.pick(CITIES),
    source: rand.weighted(SOURCES),
    status,
    priority,
    value,
    tags,
    notes: rand.chance(0.5) ? rand.pick(NOTES) : null,
    lost_reason: status === 'lost' ? rand.pick(LOST_REASONS) : null,
    expected_close: status === 'converted' || status === 'lost'
      ? null
      : new Date(now + rand.int(5, 75) * DAY).toISOString().slice(0, 10),
    created_at: createdAt,
    converted_at: status === 'converted' ? closedAt : null,
    closed_at: closedAt,
  };
}

function buildActivities(rand, now, lead, ownerId) {
  const items = [];
  const end = lead.closed_at?.getTime() ?? now;
  const span = Math.max(DAY / 2, end - lead.created_at.getTime());
  const at = (fraction) => new Date(lead.created_at.getTime() + span * fraction);

  const path = lead.status === 'converted'
    ? [...STAGES, 'converted']
    : lead.status === 'lost'
      ? [...STAGES.slice(0, rand.int(1, 4)), 'lost']
      : STAGES.slice(0, STAGES.indexOf(lead.status) + 1);

  path.slice(1).forEach((stage, i) => {
    const fraction = (i + 1) / path.length;
    const touch = stage === 'contacted' ? ['call', rand.pick(CALLS)] : stage === 'qualified'
      ? ['meeting', rand.pick(MEETINGS)] : stage === 'proposal' ? ['email', 'Sent proposal'] : null;
    if (touch) {
      items.push({
        type: touch[0], subject: touch[1], notes: rand.chance(0.4) ? rand.pick(NOTES) : null, created_at: at(fraction - 0.05),
      });
    }
    items.push({
      type: 'status_change',
      subject: `Moved from ${path[i]} to ${stage}`,
      notes: stage === 'lost' ? lead.lost_reason : null,
      created_at: at(fraction),
    });
  });

  const extra = rand.int(0, 3);
  for (let i = 0; i < extra; i++) {
    const kind = rand.pick(['call', 'email', 'meeting', 'note']);
    const subject = kind === 'call' ? rand.pick(CALLS) : kind === 'email' ? rand.pick(EMAILS)
      : kind === 'meeting' ? rand.pick(MEETINGS) : 'Internal note';
    items.push({ type: kind, subject, notes: kind === 'note' ? rand.pick(NOTES) : null, created_at: at(rand.next() * 0.95) });
  }

  if (lead.status === 'converted') {
    items.push({ type: 'note', subject: 'Contract signed', notes: 'Onboarding handed over to customer success.', created_at: lead.closed_at });
  }

  if (!lead.closed_at && rand.chance(0.85)) {
    const dayOffset = rand.weighted([[-rand.int(1, 6), 18], [0, 12], [rand.int(1, 3), 30], [rand.int(4, 21), 40]]);
    items.push({
      type: 'follow_up',
      subject: rand.pick(TASKS),
      created_at: new Date(now - rand.int(1, 4) * DAY),
      due_at: businessHours(rand, now + dayOffset * DAY, dayOffset === 0 ? now : null),
    });
  }
  if (rand.chance(0.5)) {
    const due = at(rand.next() * 0.8);
    items.push({ type: 'follow_up', subject: rand.pick(TASKS), created_at: due, due_at: due, completed_at: due });
  }

  return items
    .map((a) => (a.type === 'follow_up' || a.created_at.getTime() > now - DAY ? a : { ...a, created_at: businessHours(rand, a.created_at.getTime()) }))
    .filter((a) => a.created_at.getTime() <= now)
    .map((a) => ({ ...a, user_id: ownerId }));
}

export async function seed(conn, { leadCount = 140, seedValue = 42 } = {}) {
  const rand = createRandom(seedValue);
  const now = Date.now();

  const userIds = [];
  for (const u of USERS) {
    const createdAt = new Date(now - 200 * DAY);
    const [result] = await conn.query(
      'INSERT INTO users (name, email, password_hash, role, title, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [u.name, u.email, await bcrypt.hash(u.password, 10), u.role, u.title, createdAt],
    );
    userIds.push(result.insertId);
  }
  const [adminId, ...repIds] = userIds;
  const repWeights = repIds.map((id, i) => [id, [34, 26, 24, 16][i] ?? 20]);

  const leads = Array.from({ length: leadCount }, (_, i) => buildLead(rand, now, i + 1))
    .sort((a, b) => a.created_at - b.created_at);

  for (const lead of leads) {
    const ownerId = lead.created_at > now - 3 * DAY && rand.chance(0.35) ? null : rand.weighted(repWeights);
    const [result] = await conn.query('INSERT INTO leads SET ?', [{
      name: lead.name,
      company: lead.company,
      job_title: lead.job_title,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      city: lead.city,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      value: lead.value,
      expected_close: lead.expected_close,
      tags: JSON.stringify(lead.tags),
      notes: lead.notes,
      lost_reason: lead.lost_reason,
      assigned_to: ownerId,
      created_by: ownerId ?? adminId,
      converted_at: lead.converted_at,
      created_at: lead.created_at,
      updated_at: lead.closed_at ?? lead.created_at,
    }]);

    const activities = buildActivities(rand, now, lead, ownerId ?? adminId);
    if (activities.length) {
      await conn.query(
        'INSERT INTO activities (lead_id, user_id, type, subject, notes, due_at, completed_at, created_at) VALUES ?',
        [activities.map((a) => [
          result.insertId, a.user_id, a.type, a.subject, a.notes ?? null, a.due_at ?? null, a.completed_at ?? null, a.created_at,
        ])],
      );
    }

    if (ownerId && lead.created_at > now - 5 * DAY) {
      await conn.query(
        'INSERT INTO notifications (user_id, actor_id, lead_id, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [ownerId, adminId, result.insertId, 'lead_assigned', `${USERS[0].name} assigned ${lead.name} (${lead.company}) to you`, lead.created_at],
      );
    }
  }

  return USERS;
}
