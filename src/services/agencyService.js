import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeManagedAgency } from '../models/managedAgency';

const DEFAULT_PAGE_SIZE = 10;

function getAgencyFromResponse(response) {
  if (!response || !response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse agence du serveur est invalide.', 200);
  }

  return normalizeManagedAgency(response.data);
}

export async function listAgencies({
  search = '',
  status = '',
  page = 1,
  perPage = DEFAULT_PAGE_SIZE,
} = {}) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  if (search) {
    query.set('recherche', search);
  }

  if (status !== '') {
    query.set('actif', status);
  }

  const response = await apiRequest(`/agences?${query.toString()}`);

  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des agences renvoyée par le serveur est invalide.', 200);
  }

  return {
    agencies: response.data.map(normalizeManagedAgency),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function createAgency(payload) {
  const response = await apiRequest('/agences', {
    method: 'POST',
    body: payload,
  });

  return getAgencyFromResponse(response);
}

export async function updateAgency(uuid, payload) {
  const response = await apiRequest(`/agences/${encodeURIComponent(uuid)}`, {
    method: 'PATCH',
    body: payload,
  });

  return getAgencyFromResponse(response);
}
