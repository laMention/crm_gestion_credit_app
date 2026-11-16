import ApiError from '../core/api/ApiError';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value, field) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new ApiError(`Le champ transaction « ${field} » renvoyé par le serveur est invalide.`, 200);
  }

  return value || '';
}

function normalizeRelatedAccount(value, field) {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.numero_compte !== 'string'
    || typeof value.type_compte !== 'string'
  ) {
    throw new ApiError(`Le champ transaction « ${field} » est invalide.`, 200);
  }

  return {
    uuid: value.uuid,
    number: value.numero_compte,
    type: value.type_compte,
  };
}

function normalizeRelatedUser(value, field) {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.nom !== 'string'
    || typeof value.prenom !== 'string'
  ) {
    throw new ApiError(`Le champ transaction « ${field} » est invalide.`, 200);
  }

  return { uuid: value.uuid, lastName: value.nom, firstName: value.prenom };
}

export function normalizeManagedTransaction(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.reference_transaction !== 'string'
    || typeof value.type_transaction !== 'string'
    || (typeof value.montant !== 'string' && typeof value.montant !== 'number')
    || typeof value.devise !== 'string'
    || typeof value.date_transaction !== 'string'
    || typeof value.statut_transaction !== 'string'
  ) {
    throw new ApiError('Le serveur a renvoyé une transaction invalide.', 200);
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
    throw new ApiError('Le client de la transaction renvoyé par le serveur est invalide.', 200);
  }

  return {
    uuid: value.uuid,
    reference: value.reference_transaction,
    type: value.type_transaction,
    amount: String(value.montant),
    currency: value.devise,
    date: value.date_transaction,
    status: value.statut_transaction,
    reason: optionalString(value.motif, 'motif'),
    validatedAt: optionalString(value.date_validation, 'date_validation'),
    agency: value.agence,
    client: client
      ? {
        uuid: client.uuid,
        code: client.code_client,
        lastName: client.nom_client,
        firstName: client.prenom_client,
      }
      : null,
    createdBy: normalizeRelatedUser(value.utilisateur, 'utilisateur'),
    validatedBy: normalizeRelatedUser(value.validateur, 'validateur'),
    source: normalizeRelatedAccount(value.compte_source, 'compte_source'),
    recipient: normalizeRelatedAccount(value.compte_destinataire, 'compte_destinataire'),
  };
}
