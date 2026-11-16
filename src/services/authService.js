import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import {
  clearAuthToken,
  getAuthToken,
  saveAuthToken,
} from '../core/utils/authStorage';
import { normalizeAuthSession, normalizeAuthUser } from '../models/auth';

const DEVICE_NAME = 'CRM Gestion de Crédit';

export async function login({ email, password }, remember) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      email: email.trim(),
      password,
      device_name: DEVICE_NAME,
    },
  });
  const session = normalizeAuthSession(response.data);

  if (!session) {
    throw new ApiError('La réponse de connexion du serveur est invalide.', 200);
  }

  saveAuthToken(session.token, remember);

  return session.user;
}

export async function getProfile() {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Aucun jeton de session n’est disponible.', 401);
  }

  const response = await apiRequest('/auth/profile', { token });
  const user = normalizeAuthUser(response.data);

  if (!user) {
    throw new ApiError('La réponse de profil du serveur est invalide.', 200);
  }

  return user;
}

export async function getCurrentPermissions() {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Aucun jeton de session n’est disponible.', 401);
  }

  const response = await apiRequest('/auth/permissions', { token });
  const permissions = response.data?.permissions;

  if (
    !Array.isArray(permissions)
    || permissions.some(
      (permission) => !permission || typeof permission.id !== 'string',
    )
  ) {
    throw new ApiError('Les permissions de la session sont invalides.', 200);
  }

  return permissions;
}

export async function logout() {
  const token = getAuthToken();
  if (!token) {
    clearAuthToken();
    return;
  }

  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      token,
    });
  } finally {
    clearAuthToken();
  }
}

export function clearSession() {
  clearAuthToken();
}
