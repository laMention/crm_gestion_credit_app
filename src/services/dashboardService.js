import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import {
  normalizeDashboardIndicators,
  normalizeDashboardTransaction,
} from '../models/dashboard';

function createPeriodQuery({ dateStart, dateEnd }) {
  const query = new URLSearchParams({
    date_debut: dateStart,
    date_fin: dateEnd,
  });

  return query.toString();
}

export async function getDashboardIndicators(period) {
  const response = await apiRequest(
    `/reportings/indicateurs?${createPeriodQuery(period)}`,
  );

  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse des indicateurs du serveur est invalide.', 200);
  }

  return normalizeDashboardIndicators(response.data);
}

export async function listRecentTransactions(period) {
  const query = new URLSearchParams({
    per_page: '6',
    date_debut: period.dateStart,
    date_fin: period.dateEnd,
  });
  const response = await apiRequest(`/transactions?${query.toString()}`);

  if (!Array.isArray(response.data)) {
    throw new ApiError('La liste des transactions du serveur est invalide.', 200);
  }

  return response.data.map(normalizeDashboardTransaction);
}
