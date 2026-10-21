import { useState } from 'react';
import clsx from 'clsx';
import { Modal } from '../ui/Overlay.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Field.jsx';
import { LOST_REASONS } from '../../lib/constants.js';

export function LostReasonDialog({ open, leadName, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const value = reason === 'Other' ? custom.trim() : reason;

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Mark as lost"
      description={`Why didn't ${leadName || 'this deal'} close? This feeds your loss analysis in Reports.`}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={confirm} disabled={!value} loading={saving}>Mark as lost</Button>
        </>
      )}
    >
      <div className="grid gap-2">
        {[...LOST_REASONS, 'Other'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={clsx(
              'rounded-lg border px-3 py-2 text-left text-sm transition',
              reason === r ? 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200' : 'border-line hover:bg-surface-2',
            )}
          >
            {r}
          </button>
        ))}
        {reason === 'Other' && (
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Describe the reason" maxLength={250} data-autofocus />
        )}
      </div>
    </Modal>
  );
}
