import ApiError from '../core/api/ApiError';

const USER_ROLES = [
  'administrateur',
  'direction',
  'chef_agence',
  'conseiller',
  'caissier',
];

export function normalizeManagedUser(value) {
  if (
    !value
    || typeof value.uuid !== 'string'
    || typeof value.nom !== 'string'
    || typeof value.prenom !== 'string'
    || typeof value.email !== 'string'
    || !USER_ROLES.includes(value.role)
    || typeof value.actif !== 'boolean'
  ) {
    throw new ApiError('Le serveur a renvoyé un utilisateur invalide.', 200);
  }

  if (
    value.agence
    && (
      typeof value.agence.uuid !== 'string'
      || typeof value.agence.code !== 'string'
      || typeof value.agence.nom !== 'string'
    )
  ) {
    throw new ApiError('Le serveur a renvoyé une agence invalide.', 200);
  }

  return {
    uuid: value.uuid,
    nom: value.nom,
    prenom: value.prenom,
    adresse: value.adresse || '',
    telephone: value.telephone || '',
    ville: value.ville || '',
    email: value.email,
    role: value.role,
    actif: value.actif,
    derniereConnexion: value.derniere_connexion_le || null,
    agence: value.agence
      ? {
        uuid: value.agence.uuid,
        code: value.agence.code,
        nom: value.agence.nom,
        ville: value.agence.ville || null,
      }
      : null,
  };
}

export function normalizeRoleDefinition(value) {
  if (
    !value
    || typeof value.identifiant !== 'string'
    || typeof value.libelle !== 'string'
    || typeof value.description !== 'string'
    || !USER_ROLES.includes(value.identifiant)
    || !Array.isArray(value.permissions)
  ) {
    throw new ApiError('Le catalogue des rôles renvoyé par le serveur est invalide.', 200);
  }

  return {
    identifiant: value.identifiant,
    libelle: value.libelle,
    description: value.description,
    permissions: value.permissions.map((permission) => ({
      id: permission.id,
      identifiant: permission.identifiant,
      libelle: permission.libelle,
      module: permission.module,
      moduleLibelle: permission.module_libelle,
    })),
  };
}
