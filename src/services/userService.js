import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeManagedUser, normalizeRoleDefinition } from '../models/managedUser';

const PAGE_SIZE = 10;

function getUserFromResponse(response) {
  if (!response || !response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse utilisateur du serveur est invalide.', 200);
  }

  return normalizeManagedUser(response.data);
}

export async function listUsers({ search, role, status, page }) {
  const query = new URLSearchParams({
    per_page: String(PAGE_SIZE),
    page: String(page),
  });

  if (search) {
    query.set('recherche', search);
  }

  if (role) {
    query.set('role', role);
  }

  if (status !== '') {
    query.set('actif', status);
  }

  const response = await apiRequest(`/users?${query.toString()}`);

  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des utilisateurs renvoyée par le serveur est invalide.', 200);
  }

  return {
    users: response.data.map(normalizeManagedUser),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function listRoles() {
  const response = await apiRequest('/roles');

  if (!Array.isArray(response.data)) {
    throw new ApiError('Le catalogue des rôles renvoyé par le serveur est invalide.', 200);
  }

  return response.data.map(normalizeRoleDefinition);
}

export async function getUserPermissions(uuid) {
  const response = await apiRequest(`/users/${encodeURIComponent(uuid)}/permissions`);
  const permissions = response.data?.permissions;

  if (!Array.isArray(permissions)) {
    throw new ApiError('Les permissions de cet utilisateur sont invalides.', 200);
  }

  return permissions;
}

export async function createUser(payload) {
  const response = await apiRequest('/users', {
    method: 'POST',
    body: payload,
  });

  return getUserFromResponse(response);
}

export async function updateUser(uuid, payload) {
  const response = await apiRequest(`/users/${encodeURIComponent(uuid)}`, {
    method: 'PATCH',
    body: payload,
  });

  return getUserFromResponse(response);
}

export async function setUserActive(uuid, active) {
  const action = active ? 'activer' : 'desactiver';
  const response = await apiRequest(
    `/users/${encodeURIComponent(uuid)}/${action}`,
    { method: 'PATCH' },
  );

  return getUserFromResponse(response);
}
