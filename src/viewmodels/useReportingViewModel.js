import { useCallback, useEffect, useState } from 'react';
import { listAgencies } from '../services/agencyService';
import {
  downloadReportingExport,
  generateDailyReporting,
  getReportingIndicators,
  listReportingTransactions,
  listReportings,
} from '../services/reportingService';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function monthStart() {
  return `${todayString().slice(0, 7)}-01`;
}

export default function useReportingViewModel({ canExport, user }) {
  const [filters, setFilters] = useState({ dateStart: monthStart(), dateEnd: todayString(), agencyId: '', transactionType: '' });
  const [draft, setDraft] = useState(filters);
  const [indicators, setIndicators] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all([
        getReportingIndicators(activeFilters),
        listReportingTransactions(activeFilters),
        listReportings(activeFilters),
      ]);
      setIndicators(results[0]);
      setTransactions(results[1].rows);
      setReports(results[2].rows);
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger le reporting.');
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

  async function applyFilters(event) {
    event.preventDefault();
    if (draft.dateStart > draft.dateEnd) {
      setError('La date de début doit précéder la date de fin.');
      return;
    }
    setFilters({ ...draft });
    await load({ ...draft });
  }

  async function exportCsv() {
    setBusy(true); setError('');
    try { await downloadReportingExport(filters); }
    catch (exportError) { setError(exportError.message || 'Impossible de télécharger le rapport.'); }
    finally { setBusy(false); }
  }

  async function generate() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await generateDailyReporting({ date: filters.dateEnd, agencyId: filters.agencyId });
      setNotice(result?.message || 'Le reporting quotidien a été généré.');
      await load(filters);
    } catch (generationError) {
      setError(generationError.message || 'Impossible de générer le reporting.');
    } finally { setBusy(false); }
  }

  return {
    filters, draft, setDraft, indicators, transactions, reports, agencies,
    loading, busy, error, notice, canExport,
    applyFilters, exportCsv, generate, refresh: () => load(filters),
  };
}
