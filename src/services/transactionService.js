import ApiError from '../core/api/ApiError';
import { apiRequest } from '../core/api/httpClient';
import { normalizeManagedTransaction } from '../models/managedTransaction';

const DEFAULT_PAGE_SIZE = 10;

function normalizeTransactionPage(response) {
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError('La liste des transactions renvoyée par le serveur est invalide.', 200);
  }

  return {
    transactions: response.data.map(normalizeManagedTransaction),
    meta: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
      perPage: response.meta.per_page,
    },
  };
}

export async function listTransactions({
  reference = '',
  accountNumber = '',
  type = '',
  status = '',
  startDate = '',
  endDate = '',
  page = 1,
} = {}) {
  const query = new URLSearchParams({
    per_page: String(DEFAULT_PAGE_SIZE),
    page: String(page),
  });
  if (reference) query.set('reference_transaction', reference);
  if (accountNumber) query.set('numero_compte', accountNumber);
  if (type) query.set('type_transaction', type);
  if (status) query.set('statut_transaction', status);
  if (startDate) query.set('date_debut', startDate);
  if (endDate) query.set('date_fin', endDate);

  return normalizeTransactionPage(await apiRequest(`/transactions?${query.toString()}`));
}

export async function listPendingWithdrawals(page = 1) {
  const query = new URLSearchParams({ page: String(page) });
  return normalizeTransactionPage(
    await apiRequest(`/transactions/retraits-en-attente?${query.toString()}`),
  );
}

export async function getTransaction(uuid) {
  const response = await apiRequest(`/transactions/${encodeURIComponent(uuid)}`);
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse transaction du serveur est invalide.', 200);
  }

  return normalizeManagedTransaction(response.data);
}

export async function createFinancialOperation({
  type,
  accountUuid,
  recipientUuid,
  amount,
  reason,
  idempotencyKey,
}) {
  const paths = {
    depot: 'depots',
    retrait: 'retraits',
    virement: 'virements',
  };
  const body = { montant: amount, motif: reason || null };
  if (type === 'virement') {
    body.compte_destinataire_uuid = recipientUuid;
  }

  const response = await apiRequest(
    `/comptes/${encodeURIComponent(accountUuid)}/${paths[type]}`,
    { method: 'POST', body, idempotencyKey },
  );
  if (!response.data || Array.isArray(response.data)) {
    throw new ApiError('La réponse de l’opération financière est invalide.', 200);
  }

  return normalizeManagedTransaction(response.data);
}

export async function approveWithdrawal(uuid) {
  const response = await apiRequest(
    `/transactions/${encodeURIComponent(uuid)}/approuver`,
    { method: 'PATCH' },
  );
  return normalizeManagedTransaction(response.data);
}

export async function rejectWithdrawal(uuid, reason) {
  const response = await apiRequest(
    `/transactions/${encodeURIComponent(uuid)}/rejeter`,
    { method: 'PATCH', body: { motif: reason || null } },
  );
  return normalizeManagedTransaction(response.data);
}
