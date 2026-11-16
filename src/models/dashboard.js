import ApiError from '../core/api/ApiError';

export const TRANSACTION_TYPES = [
  'depot',
  'retrait',
  'virement',
  'paiement_facture',
  'deboursement',
  'remboursement',
];

const AMOUNT_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredCount(source, key) {
  const value = source[key];
  if (!Number.isInteger(value) || value < 0) {
    throw new ApiError('Les indicateurs du tableau de bord sont invalides.', 200);
  }

  return value;
}

function requiredAmount(source, key) {
  const value = source[key];
  if (typeof value !== 'string' || !AMOUNT_PATTERN.test(value)) {
    throw new ApiError('Les montants du tableau de bord sont invalides.', 200);
  }

  return value;
}

function normalizeTransactionStatistics(value, type) {
  if (!isRecord(value)) {
    throw new ApiError('Les statistiques de transactions sont invalides.', 200);
  }

  return {
    type,
    count: requiredCount(value, 'nombre'),
    totalAmount: requiredAmount(value, 'montant_total'),
    averageAmount: requiredAmount(value, 'montant_moyen'),
  };
}

export function normalizeDashboardIndicators(value) {
  if (
    !isRecord(value)
    || !isRecord(value.periode)
    || !DATE_PATTERN.test(value.periode.date_debut)
    || !DATE_PATTERN.test(value.periode.date_fin)
    || typeof value.perimetre !== 'string'
    || !isRecord(value.indicateurs_generaux)
    || !isRecord(value.indicateurs_credits)
    || !isRecord(value.transactions)
  ) {
    throw new ApiError('Les indicateurs renvoyés par le serveur sont invalides.', 200);
  }

  const general = value.indicateurs_generaux;
  const credits = value.indicateurs_credits;
  const transactions = {};

  TRANSACTION_TYPES.forEach((type) => {
    transactions[type] = normalizeTransactionStatistics(value.transactions[type], type);
  });

  return {
    period: {
      start: value.periode.date_debut,
      end: value.periode.date_fin,
    },
    perimeter: value.perimetre,
    overview: {
      totalClients: requiredCount(general, 'nombre_total_clients'),
      newClients: requiredCount(general, 'nombre_nouveaux_clients'),
      totalAccounts: requiredCount(general, 'nombre_total_comptes'),
      activeAccounts: requiredCount(general, 'nombre_comptes_actifs'),
      totalTransactions: requiredCount(general, 'nombre_total_transactions'),
      grossVolume: requiredAmount(general, 'volume_brut_operations'),
      netFlow: requiredAmount(general, 'flux_net_hors_virements'),
      activeCredits: requiredCount(general, 'nombre_credits_en_cours'),
      remainingPrincipal: requiredAmount(general, 'capital_restant_du'),
      overdueInstallments: requiredCount(general, 'nombre_echeances_en_retard'),
      unpaidInstallmentsAmount: requiredAmount(
        general,
        'montant_total_echeances_impayees',
      ),
    },
    creditRequestsAwaitingValidation: requiredCount(
      credits,
      'demandes_en_attente_validation',
    ),
    transactions,
  };
}

function optionalRecord(value) {
  return isRecord(value) ? value : null;
}

export function normalizeDashboardTransaction(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.reference_transaction !== 'string'
    || !TRANSACTION_TYPES.includes(value.type_transaction)
    || typeof value.montant !== 'string'
    || !AMOUNT_PATTERN.test(value.montant)
    || typeof value.devise !== 'string'
    || typeof value.date_transaction !== 'string'
    || Number.isNaN(Date.parse(value.date_transaction))
    || !['en_attente', 'terminee', 'annulee'].includes(value.statut_transaction)
  ) {
    throw new ApiError('Une transaction renvoyée par le serveur est invalide.', 200);
  }

  const client = optionalRecord(value.client);
  const sourceAccount = optionalRecord(value.compte_source);
  const destinationAccount = optionalRecord(value.compte_destinataire);

  return {
    uuid: value.uuid,
    reference: value.reference_transaction,
    type: value.type_transaction,
    amount: value.montant,
    currency: value.devise,
    date: value.date_transaction,
    status: value.statut_transaction,
    clientName: client
      ? [client.prenom_client, client.nom_client].filter(Boolean).join(' ')
      : '',
    accountNumber: sourceAccount?.numero_compte
      || destinationAccount?.numero_compte
      || '',
  };
}
