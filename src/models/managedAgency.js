import ApiError from '../core/api/ApiError';

export function normalizeManagedAgency(value) {
  if (
    !value
    || !Number.isInteger(value.id)
    || typeof value.uuid !== 'string'
    || typeof value.code_agence !== 'string'
    || typeof value.nom_agence !== 'string'
    || typeof value.adresse_agence !== 'string'
    || typeof value.ville_agence !== 'string'
    || typeof value.telephone_agence !== 'string'
    || typeof value.email_agence !== 'string'
    || typeof value.actif !== 'boolean'
  ) {
    throw new ApiError('Le serveur a renvoyé une agence invalide.', 200);
  }

  return {
    id: value.id,
    uuid: value.uuid,
    code: value.code_agence,
    name: value.nom_agence,
    address: value.adresse_agence,
    city: value.ville_agence,
    phone: value.telephone_agence,
    email: value.email_agence,
    active: value.actif,
    createdAt: value.cree_le || null,
    updatedAt: value.modifie_le || null,
  };
}
