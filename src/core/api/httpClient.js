import ApiError from './ApiError';
import { API_BASE_URL } from '../config/apiConfig';
import { getAuthToken } from '../utils/authStorage';

function validationMessage(errors) {
  if (!errors || typeof errors !== 'object') {
    return null;
  }

  const firstError = Object.values(errors)
    .flat()
    .find((message) => typeof message === 'string');

  return firstError || null;
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const authToken = token || getAuthToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        'Impossible de joindre le serveur. Vérifiez la connexion et l’adresse de l’API.',
      );
    }

    throw error;
  }

  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  if (!response.ok) {
    const message = validationMessage(payload?.errors)
      || payload?.message
      || `La requête a échoué (HTTP ${response.status}).`;

    throw new ApiError(message, response.status, payload?.errors || null);
  }

  if (!payload || typeof payload !== 'object') {
    throw new ApiError('Le serveur a renvoyé une réponse illisible.', response.status);
  }

  return payload;
}
