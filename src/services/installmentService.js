import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeCreditInstallment } from '../models/managedCredit';

export async function listCreditInstallments(creditUuid) {
  const installments = [];
  let total = 0;
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page += 1) {
    const query = new URLSearchParams({
      credit_uuid: creditUuid,
      per_page: '100',
      page: String(page),
    });
    const response = await apiRequest(`/echeances?${query.toString()}`);
    if (!Array.isArray(response.data) || !response.meta) {
      throw new ApiError('La liste des échéances du crédit est invalide.', 200);
    }
    installments.push(...response.data.map(normalizeCreditInstallment));
    total = response.meta.total;
    lastPage = response.meta.last_page;
  }

  return {
    installments,
    total,
  };
}
