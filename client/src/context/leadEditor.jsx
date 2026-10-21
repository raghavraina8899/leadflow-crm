import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { announceLeadsChanged } from '../lib/hooks.js';
import { invalidateDirectory } from '../lib/directory.js';
import { LeadFormDrawer } from '../components/leads/LeadFormDrawer.jsx';
import { useToast } from './toast.jsx';

const LeadEditorContext = createContext(null);

export function LeadEditorProvider({ children }) {
  const [state, setState] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const openLeadForm = useCallback((lead = null, { onSaved } = {}) => {
    setState({ lead, onSaved, key: Date.now() });
  }, []);

  const close = useCallback(() => setState(null), []);

  const submit = async (form) => {
    const editing = Boolean(state.lead?.id);
    const saved = editing ? await api.put(`/leads/${state.lead.id}`, form) : await api.post('/leads', form);
    invalidateDirectory();
    announceLeadsChanged();
    state.onSaved?.(saved);
    close();
    if (editing) {
      toast.success('Lead updated');
    } else {
      toast.success('Lead created', `${saved.name} was added to your pipeline.`);
      navigate(`/leads/${saved.id}`);
    }
  };

  return (
    <LeadEditorContext.Provider value={openLeadForm}>
      {children}
      {state && <LeadFormDrawer key={state.key} open lead={state.lead} onClose={close} onSubmit={submit} />}
    </LeadEditorContext.Provider>
  );
}

export const useLeadEditor = () => useContext(LeadEditorContext);
