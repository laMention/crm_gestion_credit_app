/**
 * @typedef {Object} AuthAgency
 * @property {string} uuid
 * @property {string} code
 * @property {string} nom
 * @property {string|null} ville
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} uuid
 * @property {string} nom
 * @property {string} prenom
 * @property {string} email
 * @property {string} role
 * @property {AuthAgency|null} agence
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} token
 * @property {'Bearer'} tokenType
 * @property {AuthUser} user
 */

export function normalizeAuthUser(value) {
  if (
    !value
    || typeof value.uuid !== 'string'
    || typeof value.nom !== 'string'
    || typeof value.prenom !== 'string'
    || typeof value.email !== 'string'
    || typeof value.role !== 'string'
  ) {
    return null;
  }

  let agence = null;
  if (value.agence !== null && value.agence !== undefined) {
    if (
      typeof value.agence.uuid !== 'string'
      || typeof value.agence.code !== 'string'
      || typeof value.agence.nom !== 'string'
    ) {
      return null;
    }

    agence = {
      uuid: value.agence.uuid,
      code: value.agence.code,
      nom: value.agence.nom,
      ville: typeof value.agence.ville === 'string' ? value.agence.ville : null,
    };
  }

  return {
    uuid: value.uuid,
    nom: value.nom,
    prenom: value.prenom,
    email: value.email,
    role: value.role,
    agence,
  };
}

export function normalizeAuthSession(value) {
  if (
    !value
    || typeof value.token !== 'string'
    || value.token.length === 0
    || value.token_type !== 'Bearer'
  ) {
    return null;
  }

  const user = normalizeAuthUser(value.user);
  if (!user) {
    return null;
  }

  return {
    token: value.token,
    tokenType: value.token_type,
    user,
  };
}
