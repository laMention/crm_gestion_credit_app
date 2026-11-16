import ApiError from '../core/api/ApiError';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, field) {
  if (typeof value !== 'string') {
    throw new ApiError(`Le champ compte « ${field} » renvoyé par le serveur est invalide.`, 200);
  }

  return value;
}

function optionalString(value, field) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new ApiError(`Le champ compte « ${field} » renvoyé par le serveur est invalide.`, 200);
  }

  return value || '';
}

export function normalizeManagedAccount(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.numero_compte !== 'string'
    || typeof value.type_compte !== 'string'
    || (typeof value.solde !== 'string' && typeof value.solde !== 'number')
    || typeof value.devise !== 'string'
    || typeof value.statut_compte !== 'string'
  ) {
    throw new ApiError('Le serveur a renvoyé un compte invalide.', 200);
  }

  const client = value.client;
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
    throw new ApiError('Le serveur a renvoyé un client de compte invalide.', 200);
  }

  const agency = value.agence;
  if (
    agency !== null
    && agency !== undefined
    && (
      !isRecord(agency)
      || typeof agency.uuid !== 'string'
      || typeof agency.code !== 'string'
      || typeof agency.nom !== 'string'
    )
  ) {
    throw new ApiError('Le serveur a renvoyé une agence de compte invalide.', 200);
  }

  return {
    uuid: value.uuid,
    number: value.numero_compte,
    type: value.type_compte,
    balance: String(value.solde),
    initialBalance: optionalString(value.solde_initial, 'solde_initial'),
    currency: value.devise,
    openedAt: optionalString(value.date_ouverture, 'date_ouverture'),
    closedAt: optionalString(value.date_cloture, 'date_cloture'),
    status: value.statut_compte,
    client: client
      ? {
        uuid: client.uuid,
        code: client.code_client,
        lastName: client.nom_client,
        firstName: client.prenom_client,
      }
      : null,
    agency: agency
      ? { uuid: agency.uuid, code: agency.code, name: agency.nom }
      : null,
    createdAt: optionalString(value.cree_le, 'cree_le'),
  };
}

export function normalizeAccountStatement(value) {
  const pagination = isRecord(value?.operations?.meta)
    ? value.operations.meta
    : value?.operations;

  if (
    !isRecord(value)
    || !isRecord(value.compte)
    || !isRecord(value.periode)
    || !isRecord(value.totaux)
    || !isRecord(value.operations)
    || !Array.isArray(value.operations.data)
    || !isRecord(pagination)
  ) {
    throw new ApiError('Le relevé de compte renvoyé par le serveur est invalide.', 200);
  }

  const account = value.compte;
  const period = value.periode;
  const totals = value.totaux;
  return {
    account: {
      number: requiredString(account.numero_compte, 'numero_compte'),
      type: requiredString(account.type_compte, 'type_compte'),
      status: requiredString(account.statut_compte, 'statut_compte'),
      currency: requiredString(account.devise, 'devise'),
      client: account.client,
    },
    period: {
      start: requiredString(period.date_debut, 'date_debut'),
      end: requiredString(period.date_fin, 'date_fin'),
      openingBalance: requiredString(period.solde_initial, 'solde_initial'),
    },
    totals: {
      credits: requiredString(totals.total_credits, 'total_credits'),
      debits: requiredString(totals.total_debits, 'total_debits'),
      closingBalance: requiredString(totals.solde_final, 'solde_final'),
    },
    operations: value.operations.data.map((operation) => {
      if (
        !isRecord(operation)
        || typeof operation.date_heure !== 'string'
        || typeof operation.reference_transaction !== 'string'
        || typeof operation.type_operation !== 'string'
        || typeof operation.libelle !== 'string'
        || (typeof operation.montant !== 'string' && typeof operation.montant !== 'number')
        || !['debit', 'credit'].includes(operation.sens)
        || (typeof operation.solde_apres_operation !== 'string'
          && typeof operation.solde_apres_operation !== 'number')
      ) {
        throw new ApiError('Le serveur a renvoyé une opération de compte invalide.', 200);
      }

      return {
        date: operation.date_heure,
        reference: operation.reference_transaction,
        type: operation.type_operation,
        label: operation.libelle,
        amount: String(operation.montant),
        direction: operation.sens,
        balanceAfter: String(operation.solde_apres_operation),
      };
    }),
    meta: {
      currentPage: pagination.current_page,
      lastPage: pagination.last_page,
      total: pagination.total,
      perPage: pagination.per_page,
    },
  };
}
