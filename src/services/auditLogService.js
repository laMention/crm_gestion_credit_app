import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';

function buildQuery(filters, page = 1) {
  const query = new URLSearchParams({ per_page: '20', page: String(page) });
  const mapping = {
    dateStart: 'date_debut', dateEnd: 'date_fin', agencyId: 'agence_id', userUuid: 'user_uuid',
    role: 'role', module: 'module', action: 'action', result: 'resultat',
    recordId: 'enregistrement_id', resourceType: 'type_ressource',
  };
  Object.entries(mapping).forEach(([key, parameter]) => {
    if (filters[key] !== undefined && filters[key] !== '') query.set(parameter, filters[key]);
  });
  return query.toString();
}

export async function listAuditLogs(filters, page = 1) {
  const response = await apiRequest(`/journaux-audit?${buildQuery(filters, page)}`);
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste du journal d’audit renvoyée par le serveur est invalide.', 200);
  }
  return { rows: response.data, meta: response.meta };
}

export async function getAuditLog(uuid) {
  const response = await apiRequest(`/journaux-audit/${encodeURIComponent(uuid)}`);
  if (!response.data || typeof response.data !== 'object') {
    throw new ApiError('Le détail de cette entrée d’audit est invalide.', 200);
  }
  return response.data;
}
