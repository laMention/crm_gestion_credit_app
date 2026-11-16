import { useCallback, useEffect, useState } from 'react';
import { listAgencies } from '../services/agencyService';
import { getAuditLog, listAuditLogs } from '../services/auditLogService';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function useAuditLogsViewModel({ user }) {
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', agencyId: '', userUuid: '', role: '', module: '', action: '', result: '', recordId: '', resourceType: '' });
  const [draft, setDraft] = useState(filters);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (activeFilters = filters, page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await listAuditLogs(activeFilters, page);
      setLogs(result.rows);
      setMeta(result.meta);
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger le journal d’audit.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (['administrateur', 'direction'].includes(user?.role)) {
      listAgencies({ perPage: 100 }).then(({ agencies: rows }) => setAgencies(rows)).catch(() => {});
    }
  }, [user]);

  function applyFilters(event) {
    event.preventDefault();
    if (draft.dateStart && draft.dateEnd && draft.dateStart > draft.dateEnd) {
      setError('La date de début doit précéder la date de fin.');
      return;
    }
    setFilters({ ...draft });
  }

  async function changePage(page) {
    await load(filters, page);
  }

  function clearFilters() {
    const empty = { dateStart: '', dateEnd: '', agencyId: '', userUuid: '', role: '', module: '', action: '', result: '', recordId: '', resourceType: '' };
    setDraft(empty);
    setFilters(empty);
    setSelectedLog(null);
  }

  async function openDetail(uuid) {
    setDetailLoading(true);
    setError('');
    try { setSelectedLog(await getAuditLog(uuid)); }
    catch (detailError) { setError(detailError.message || 'Impossible de charger le détail.'); }
    finally { setDetailLoading(false); }
  }

  return {
    filters, draft, setDraft, logs, meta, agencies, loading, error,
    selectedLog, setSelectedLog, detailLoading,
    applyFilters, clearFilters, changePage, openDetail, refresh: () => load(filters, meta.current_page), today: todayString(),
  };
}
