import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeManagedClient } from '../models/managedClient';

const PAGE_SIZE = 10;

function getClientFromResponse(response) {
  if (!response || !response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse client du serveur est invalide.', 200);
  }

  return normalizeManagedClient(response.data);
}

export async function listClients({ search, status, page, perPage = PAGE_SIZE }) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  if (search) {
    query.set('recherche', search);
  }

  if (status) {
    query.set('statut', status);
  }

  const response = await apiRequest(`/clients?${query.toString()}`);

  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des clients renvoyée par le serveur est invalide.', 200);
  }

  return {
    clients: response.data.map(normalizeManagedClient),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function getClient(uuid) {
  const response = await apiRequest(`/clients/${encodeURIComponent(uuid)}`);
  return getClientFromResponse(response);
}

export async function createClient(payload) {
  const response = await apiRequest('/clients', {
    method: 'POST',
    body: payload,
  });

  return getClientFromResponse(response);
}

export async function updateClient(uuid, payload) {
  const response = await apiRequest(`/clients/${encodeURIComponent(uuid)}`, {
    method: 'PATCH',
    body: payload,
  });

  return getClientFromResponse(response);
}
