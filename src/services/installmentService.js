import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeCreditInstallment } from '../models/managedCredit';

export async function listInstallments({
  clientUuid = '',
  creditUuid = '',
  status = '',
  unpaidOnly = false,
  overdueOnly = false,
  startDate = '',
  endDate = '',
  page = 1,
  perPage = 10,
} = {}) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (clientUuid) query.set('client_uuid', clientUuid);
  if (creditUuid) query.set('credit_uuid', creditUuid);
  if (status) query.set('statut_echeance_credit', status);
  if (unpaidOnly) query.set('impayees', '1');
  if (overdueOnly) query.set('en_retard', '1');
  if (startDate) query.set('date_debut', startDate);
  if (endDate) query.set('date_fin', endDate);

  const response = await apiRequest(`/echeances?${query.toString()}`);
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des échéances est invalide.', 200);
  }

  return {
    installments: response.data.map(normalizeCreditInstallment),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function getCreditInstallment(uuid) {
  const response = await apiRequest(`/echeances/${encodeURIComponent(uuid)}`);
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse de l’échéance est invalide.', 200);
  }
  return normalizeCreditInstallment(response.data);
}

export async function listCreditInstallments(creditUuid) {
  const installments = [];
  let total = 0;
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page += 1) {
    const result = await listInstallments({
      creditUuid,
      perPage: 100,
      page,
    });
    installments.push(...result.installments);
    total = result.meta.total;
    lastPage = result.meta.lastPage;
  }

  return {
    installments,
    total,
  };
}
