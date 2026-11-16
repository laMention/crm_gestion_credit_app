const TOKEN_KEY = 'crm.auth.token';

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY)
    || window.sessionStorage.getItem(TOKEN_KEY);
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

export function saveAuthToken(token, remember) {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);

  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}
