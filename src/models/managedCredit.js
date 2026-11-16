import ApiError from '../core/api/ApiError';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, field) {
  if (typeof value !== 'string') {
    throw new ApiError(`Le champ crédit « ${field} » renvoyé par le serveur est invalide.`, 200);
  }
  return value;
}

function optionalString(value, field) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new ApiError(`Le champ crédit « ${field} » renvoyé par le serveur est invalide.`, 200);
  }
  return value || '';
}

function normalizeRelatedUser(value, field) {
  if (value === null || value === undefined) return null;
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.nom !== 'string'
    || typeof value.prenom !== 'string'
  ) {
    throw new ApiError(`Le champ crédit « ${field} » renvoyé par le serveur est invalide.`, 200);
  }
  return { uuid: value.uuid, firstName: value.prenom, lastName: value.nom };
}

export function normalizeManagedCredit(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.statut !== 'string'
    || (typeof value.montant_demande !== 'string' && typeof value.montant_demande !== 'number')
    || (typeof value.taux_interet_annuel !== 'string' && typeof value.taux_interet_annuel !== 'number')
    || !Number.isInteger(Number(value.duree_mois))
  ) {
    throw new ApiError('Le serveur a renvoyé un crédit invalide.', 200);
  }

  const account = value.compte;
  if (
    account !== null
    && account !== undefined
    && (
      !isRecord(account)
      || typeof account.uuid !== 'string'
      || typeof account.numero_compte !== 'string'
      || typeof account.type_compte !== 'string'
      || typeof account.devise !== 'string'
    )
  ) {
    throw new ApiError('Le compte associé au crédit renvoyé par le serveur est invalide.', 200);
  }

  let client = null;
  if (account?.client) {
    const accountClient = account.client;
    if (
      !isRecord(accountClient)
      || typeof accountClient.uuid !== 'string'
      || typeof accountClient.code_client !== 'string'
      || typeof accountClient.nom_client !== 'string'
      || typeof accountClient.prenom_client !== 'string'
    ) {
      throw new ApiError('Le client du crédit renvoyé par le serveur est invalide.', 200);
    }
    client = {
      uuid: accountClient.uuid,
      code: accountClient.code_client,
      firstName: accountClient.prenom_client,
      lastName: accountClient.nom_client,
    };
  }

  const installmentCount = value.echeances_count;
  if (installmentCount !== undefined && !Number.isInteger(installmentCount)) {
    throw new ApiError('Le nombre d’échéances du crédit est invalide.', 200);
  }

  return {
    uuid: value.uuid,
    status: value.statut,
    requestedAmount: String(value.montant_demande),
    approvedAmount: optionalString(value.montant_accorde, 'montant_accorde'),
    annualRate: String(value.taux_interet_annuel),
    durationMonths: Number(value.duree_mois),
    monthlyPayment: optionalString(value.mensualite, 'mensualite'),
    remainingPrincipal: optionalString(value.capital_restant_du, 'capital_restant_du'),
    totalInterest: optionalString(value.montant_total_interets, 'montant_total_interets'),
    requestedAt: optionalString(value.date_demande, 'date_demande'),
    approvedAt: optionalString(value.date_approbation, 'date_approbation'),
    disbursedAt: optionalString(value.date_deboursement, 'date_deboursement'),
    repaymentStartAt: optionalString(value.date_debut_remboursement, 'date_debut_remboursement'),
    expectedEndAt: optionalString(value.date_fin_prevue, 'date_fin_prevue'),
    rejectionReason: optionalString(value.motif_rejet, 'motif_rejet'),
    observations: optionalString(value.observations, 'observations'),
    account: account
      ? {
        uuid: account.uuid,
        number: account.numero_compte,
        type: account.type_compte,
        currency: account.devise,
        client,
      }
      : null,
    advisor: normalizeRelatedUser(value.conseiller, 'conseiller'),
    validator: normalizeRelatedUser(value.validateur, 'validateur'),
    installmentCount: installmentCount ?? 0,
  };
}

export function normalizeCreditTracking(value) {
  if (!isRecord(value)) {
    throw new ApiError('Le suivi des crédits renvoyé par le serveur est invalide.', 200);
  }
  const countFields = [
    'credits_en_instruction',
    'credits_en_attente_validation',
    'credits_approuves',
    'credits_debourses',
    'credits_soldes',
    'credits_en_retard',
    'credits_impayes_plus_de_30_jours',
  ];
  if (countFields.some((field) => !Number.isInteger(value[field]))) {
    throw new ApiError('Les indicateurs de crédits renvoyés par le serveur sont invalides.', 200);
  }

  return {
    inStudy: value.credits_en_instruction,
    awaitingApproval: value.credits_en_attente_validation,
    approved: value.credits_approuves,
    disbursed: value.credits_debourses,
    settled: value.credits_soldes,
    overdue: value.credits_en_retard,
    overdueMoreThan30Days: value.credits_impayes_plus_de_30_jours,
    disbursedAmount: requiredString(value.montant_total_credits_debourses, 'montant_total_credits_debourses'),
    remainingPrincipal: requiredString(value.capital_restant_du, 'capital_restant_du'),
    unpaidInstallments: requiredString(value.montant_echeances_impayees, 'montant_echeances_impayees'),
  };
}

export function normalizeCreditInstallment(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || !Number.isInteger(Number(value.numero_echeance))
    || typeof value.date_echeance !== 'string'
    || typeof value.statut_echeance_credit !== 'string'
  ) {
    throw new ApiError('Le serveur a renvoyé une échéance de crédit invalide.', 200);
  }

  const credit = value.credit;
  if (
    credit !== null
    && credit !== undefined
    && (
      !isRecord(credit)
      || typeof credit.uuid !== 'string'
      || typeof credit.statut !== 'string'
      || (credit.compte !== null
        && credit.compte !== undefined
        && (
          !isRecord(credit.compte)
          || typeof credit.compte.uuid !== 'string'
          || typeof credit.compte.numero_compte !== 'string'
        ))
    )
  ) {
    throw new ApiError('Le crédit associé à l’échéance renvoyé par le serveur est invalide.', 200);
  }

  const client = credit?.compte?.client;
  if (
    client !== null
    && client !== undefined
    && (
      !isRecord(client)
      || typeof client.uuid !== 'string'
      || typeof client.code_client !== 'string'
      || typeof client.nom_client !== 'string'
      || typeof client.prenom_client !== 'string'
    )
  ) {
    throw new ApiError('Le client associé à l’échéance renvoyé par le serveur est invalide.', 200);
  }

  return {
    uuid: value.uuid,
    number: Number(value.numero_echeance),
    dueAt: value.date_echeance,
    principal: String(value.capital),
    interest: String(value.interet),
    amount: String(value.montant_echeance),
    paid: String(value.montant_paye),
    remaining: String(value.reste_a_payer),
    paidAt: optionalString(value.date_paiement, 'date_paiement'),
    status: value.statut_echeance_credit,
    credit: credit
      ? {
        uuid: credit.uuid,
        status: credit.statut,
        account: credit.compte
          ? {
            uuid: credit.compte.uuid,
            number: credit.compte.numero_compte,
            client: client
              ? {
                uuid: client.uuid,
                code: client.code_client,
                firstName: client.prenom_client,
                lastName: client.nom_client,
              }
              : null,
          }
          : null,
      }
      : null,
  };
}
