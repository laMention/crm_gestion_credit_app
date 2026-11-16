import ApiError from '../core/api/ApiError';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value, field) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new ApiError(`Le champ client « ${field} » renvoyé par le serveur est invalide.`, 200);
  }

  return value || '';
}

export function normalizeManagedClient(value) {
  if (
    !isRecord(value)
    || typeof value.uuid !== 'string'
    || typeof value.code_client !== 'string'
    || typeof value.nom_client !== 'string'
    || typeof value.prenom_client !== 'string'
    || typeof value.adresse_client !== 'string'
    || typeof value.telephone_client !== 'string'
    || typeof value.ville_client !== 'string'
    || typeof value.email_client !== 'string'
    || typeof value.statut !== 'string'
    || !Number.isInteger(value.comptes_count)
    || value.comptes_count < 0
  ) {
    throw new ApiError('Le serveur a renvoyé un client invalide.', 200);
  }

  if (
    value.agence !== null
    && value.agence !== undefined
    && (
      !isRecord(value.agence)
      || typeof value.agence.uuid !== 'string'
      || typeof value.agence.code !== 'string'
      || typeof value.agence.nom !== 'string'
    )
  ) {
    throw new ApiError('Le serveur a renvoyé une agence client invalide.', 200);
  }

  return {
    uuid: value.uuid,
    code: value.code_client,
    lastName: value.nom_client,
    firstName: value.prenom_client,
    address: value.adresse_client,
    phone: value.telephone_client,
    city: value.ville_client,
    email: value.email_client,
    birthDate: optionalString(value.date_naissance, 'date_naissance'),
    birthPlace: optionalString(value.lieu_naissance, 'lieu_naissance'),
    gender: optionalString(value.sexe, 'sexe'),
    profession: optionalString(value.profession, 'profession'),
    status: value.statut,
    accountCount: value.comptes_count,
    createdAt: optionalString(value.cree_le, 'cree_le'),
    updatedAt: optionalString(value.modifie_le, 'modifie_le'),
    agency: value.agence
      ? {
        uuid: value.agence.uuid,
        code: value.agence.code,
        name: value.agence.nom,
      }
      : null,
  };
}
