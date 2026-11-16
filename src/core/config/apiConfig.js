const configuredApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '');
