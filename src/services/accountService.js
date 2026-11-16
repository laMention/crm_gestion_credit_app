import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeAccountStatement, normalizeManagedAccount } from '../models/managedAccount';

const DEFAULT_PAGE_SIZE = 10;
const STATEMENT_PAGE_SIZE = 20;

export async function listAccounts({
  number = '',
  type = '',
  status = '',
  page = 1,
  perPage = DEFAULT_PAGE_SIZE,
} = {}) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });

  if (number) {
    query.set('numero_compte', number);
  }
  if (type) {
    query.set('type_compte', type);
  }
  if (status) {
    query.set('statut_compte', status);
  }

  const response = await apiRequest(`/comptes?${query.toString()}`);
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des comptes renvoyée par le serveur est invalide.', 200);
  }

  return {
    accounts: response.data.map(normalizeManagedAccount),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function getAccount(uuid) {
  const response = await apiRequest(`/comptes/${encodeURIComponent(uuid)}`);
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse compte du serveur est invalide.', 200);
  }

  return normalizeManagedAccount(response.data);
}

export async function openAccount(clientUuid, type) {
  const response = await apiRequest(`/clients/${encodeURIComponent(clientUuid)}/comptes`, {
    method: 'POST',
    body: { type_compte: type },
  });

  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse d’ouverture du compte est invalide.', 200);
  }

  return normalizeManagedAccount(response.data);
}

export async function getAccountStatement(uuid, { start, end, page = 1 }) {
  const query = new URLSearchParams({
    date_debut: start,
    date_fin: end,
    operations_par_page: String(STATEMENT_PAGE_SIZE),
    page: String(page),
  });
  const response = await apiRequest(
    `/comptes/${encodeURIComponent(uuid)}/releve?${query.toString()}`,
  );

  return normalizeAccountStatement(response.data);
}
