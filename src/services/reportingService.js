import ApiError from '../core/api/ApiError';
import { API_BASE_URL } from '../core/config/apiConfig';
import { apiRequest } from '../core/api/httpClient';
import { getAuthToken } from '../core/utils/authStorage';

function periodQuery({ dateStart, dateEnd, agencyId, transactionType, page = 1 }) {
  const query = new URLSearchParams({
    date_debut: dateStart,
    date_fin: dateEnd,
    per_page: '10',
    page: String(page),
  });
  if (agencyId) query.set('agence_id', agencyId);
  if (transactionType) query.set('type_transaction', transactionType);
  return query.toString();
}

export async function getReportingIndicators(filters) {
  const response = await apiRequest(`/reportings/indicateurs?${periodQuery(filters)}`);
  if (!response.data || typeof response.data !== 'object') {
    throw new ApiError('Les indicateurs de reporting sont invalides.', 200);
  }
  return response.data;
}

export async function listReportingTransactions(filters) {
  const response = await apiRequest(`/reportings/transactions?${periodQuery(filters)}`);
  if (!Array.isArray(response.data)) {
    throw new ApiError('La liste des transactions du reporting est invalide.', 200);
  }
  return { rows: response.data, meta: response.meta || {} };
}

export async function listReportings(filters) {
  const response = await apiRequest(`/reportings?${periodQuery(filters)}`);
  if (!Array.isArray(response.data)) {
    throw new ApiError('L’historique des reportings est invalide.', 200);
  }
  return { rows: response.data, meta: response.meta || {} };
}

export async function generateDailyReporting({ date, agencyId }) {
  const response = await apiRequest('/reportings/generer', {
    method: 'POST',
    body: { date_reporting: date, ...(agencyId ? { agence_id: Number(agencyId) } : {}) },
  });
  return { data: response.data, message: response.message };
}

export async function downloadReportingExport(filters) {
  const headers = { Accept: 'text/csv' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/reportings/export?${periodQuery(filters)}`, {
      headers,
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (error) {
    if (error instanceof TypeError) throw new ApiError('Impossible de joindre le serveur.');
    throw error;
  }
  if (!response.ok) {
    let payload = null;
    try { payload = await response.json(); } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    throw new ApiError(payload?.message || `L’export a échoué (HTTP ${response.status}).`, response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'reporting.csv';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
