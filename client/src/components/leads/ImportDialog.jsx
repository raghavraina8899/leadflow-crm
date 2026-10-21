import { useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Modal } from '../ui/Overlay.jsx';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Field.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/auth.jsx';
import { useTeam } from '../../lib/directory.js';
import { SAMPLE_CSV, mapLeadRows, parseCsv } from '../../lib/csv.js';
import { pluralize } from '../../lib/format.js';

export function ImportDialog({ open, onClose, onImported }) {
  const { isAdmin } = useAuth();
  const team = useTeam();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [owner, setOwner] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const load = async (f) => {
    reset();
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError('Please choose a .csv file.');
    const rows = parseCsv(await f.text());
    if (rows.length < 2) return setError('That file has no data rows.');
    const mapped = mapLeadRows(rows);
    if (!mapped.matched.includes('name')) return setError('Could not find a "Name" column. Check the header row.');
    setFile(f);
    setParsed(mapped);
  };

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'leadflow-import-template.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/leads/import', { rows: parsed.leads, assigned_to: owner || null });
      setResult(res);
      onImported?.(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import leads"
      description="Upload a CSV exported from Excel, Google Sheets or another CRM."
      footer={result ? (
        <Button variant="primary" onClick={close}>Done</Button>
      ) : (
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!parsed} loading={busy}>
            {parsed ? `Import ${pluralize(parsed.leads.length, 'lead')}` : 'Import'}
          </Button>
        </>
      )}
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
            <div>
              <p className="font-medium">{pluralize(result.created, 'lead')} imported</p>
              {result.skipped > 0 && <p className="text-muted">{pluralize(result.skipped, 'row')} skipped.</p>}
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="scrollbar-thin max-h-48 overflow-y-auto rounded-lg border border-line text-[13px]">
              {result.errors.map((e) => (
                <div key={e.row} className="flex gap-3 border-b border-line px-3 py-2 last:border-0">
                  <span className="w-14 shrink-0 text-subtle">Row {e.row}</span>
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); load(e.dataTransfer.files[0]); }}
            className={clsx(
              'flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition',
              dragging ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-line hover:border-line-strong hover:bg-surface-2/60',
            )}
          >
            {file ? <FileSpreadsheet className="size-8 text-indigo-500" /> : <UploadCloud className="size-8 text-subtle" />}
            <p className="mt-3 font-medium">{file ? file.name : 'Drop a CSV here or click to browse'}</p>
            <p className="mt-1 text-xs text-muted">
              {parsed ? `${pluralize(parsed.leads.length, 'row')} · ${parsed.matched.length} columns matched` : 'Name is required. Email duplicates are skipped automatically.'}
            </p>
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => load(e.target.files[0])} />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          {parsed && (
            <>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {parsed.matched.map((m) => <span key={m} className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{m.replace('_', ' ')}</span>)}
                {parsed.unmatched.map((m) => <span key={m} className="rounded-md bg-surface-2 px-2 py-0.5 text-subtle line-through">{m}</span>)}
              </div>
              <div className="scrollbar-thin overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>{['Name', 'Company', 'Email', 'Stage', 'Value'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.leads.slice(0, 4).map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-2">{l.name || <span className="text-rose-500">missing</span>}</td>
                        <td className="px-3 py-2 text-muted">{l.company}</td>
                        <td className="px-3 py-2 text-muted">{l.email}</td>
                        <td className="px-3 py-2 text-muted">{l.status || 'new'}</td>
                        <td className="px-3 py-2 text-muted">{l.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin && (
                <Select label="Assign imported leads to" value={owner} onChange={(e) => setOwner(e.target.value)}>
                  <option value="">Leave unassigned</option>
                  {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </>
          )}

          <button type="button" onClick={downloadSample} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            <Download className="size-3.5" /> Download a sample template
          </button>
        </div>
      )}
    </Modal>
  );
}
