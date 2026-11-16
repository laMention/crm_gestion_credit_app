import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeCreditTracking, normalizeManagedCredit } from '../models/managedCredit';

const DEFAULT_PAGE_SIZE = 10;

function normalizeCreditPage(response) {
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des crédits renvoyée par le serveur est invalide.', 200);
  }
  return {
    credits: response.data.map(normalizeManagedCredit),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function listCredits({ status = '', startDate = '', endDate = '', page = 1 } = {}) {
  const query = new URLSearchParams({
    per_page: String(DEFAULT_PAGE_SIZE),
    page: String(page),
  });
  if (status) query.set('statut', status);
  if (startDate) query.set('date_debut', startDate);
  if (endDate) query.set('date_fin', endDate);
  return normalizeCreditPage(await apiRequest(`/credits?${query.toString()}`));
}

export async function getCreditTracking() {
  const response = await apiRequest('/credits/suivi');
  return normalizeCreditTracking(response.data);
}

export async function getCredit(uuid) {
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}`);
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse du crédit est invalide.', 200);
  }
  return normalizeManagedCredit(response.data);
}

export async function listCreditRepayments(uuid) {
  const response = await apiRequest(
    `/credits/${encodeURIComponent(uuid)}/remboursements`,
  );
  if (!Array.isArray(response.data)) {
    throw new ApiError('L’historique des remboursements du crédit est invalide.', 200);
  }

  return response.data.map((payment) => {
    if (
      !payment
      || typeof payment.uuid !== 'string'
      || typeof payment.reference_transaction !== 'string'
      || typeof payment.montant !== 'string'
      || !Array.isArray(payment.echeances)
    ) {
      throw new ApiError('Une opération de remboursement est invalide.', 200);
    }
    return {
      uuid: payment.uuid,
      reference: payment.reference_transaction,
      date: payment.date_transaction,
      amount: payment.montant,
      currency: payment.devise,
      allocations: payment.echeances.map((allocation) => ({
        installmentNumber: Number(allocation.numero_echeance),
        amount: String(allocation.montant),
        principal: String(allocation.capital),
        interest: String(allocation.interet),
      })),
    };
  });
}

export async function createCredit(accountUuid, payload) {
  const response = await apiRequest(`/comptes/${encodeURIComponent(accountUuid)}/credits`, {
    method: 'POST',
    body: payload,
  });
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse de création du crédit est invalide.', 200);
  }
  return normalizeManagedCredit(response.data);
}

export async function updateCredit(uuid, payload) {
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}`, {
    method: 'PATCH',
    body: payload,
  });
  return normalizeManagedCredit(response.data);
}

export async function submitCredit(uuid) {
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}/soumettre`, {
    method: 'POST',
  });
  return normalizeManagedCredit(response.data);
}

export async function approveCredit(uuid, approvedAmount = '') {
  const body = approvedAmount ? { montant_accorde: approvedAmount } : {};
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}/approuver`, {
    method: 'PATCH',
    body,
  });
  return normalizeManagedCredit(response.data);
}

export async function rejectCredit(uuid, reason) {
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}/rejeter`, {
    method: 'PATCH',
    body: { motif_rejet: reason },
  });
  return normalizeManagedCredit(response.data);
}

export async function repayCredit(uuid, { accountUuid, amount, reason, idempotencyKey }) {
  const response = await apiRequest(`/credits/${encodeURIComponent(uuid)}/remboursements`, {
    method: 'POST',
    body: {
      compte_uuid: accountUuid,
      montant: amount,
      motif: reason || null,
    },
    idempotencyKey,
  });

  if (
    !response.data
    || !response.data.transaction
    || typeof response.data.transaction.reference_transaction !== 'string'
    || !Array.isArray(response.data.echeances)
  ) {
    throw new ApiError('La réponse du remboursement est invalide.', 200);
  }

  return {
    reference: response.data.transaction.reference_transaction,
    allocations: response.data.echeances,
  };
}
