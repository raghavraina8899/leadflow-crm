import { query } from '../db.js';

export async function notify({ userId, actor, leadId = null, type, message }) {
  if (!userId || userId === actor?.id) return;
  await query('INSERT INTO notifications (user_id, actor_id, lead_id, type, message) VALUES (?, ?, ?, ?, ?)', [
    userId, actor?.id ?? null, leadId, type, message,
  ]);
}

export function notifyAssignment(actor, lead, assigneeId) {
  return notify({
    userId: assigneeId,
    actor,
    leadId: lead.id,
    type: 'lead_assigned',
    message: `${actor.name} assigned ${lead.name}${lead.company ? ` (${lead.company})` : ''} to you`,
  });
}
