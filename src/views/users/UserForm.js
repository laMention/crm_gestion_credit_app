import { useState } from 'react';

const AGENCY_ROLES = new Set(['chef_agence', 'conseiller', 'caissier']);

function UserForm({ user, roles, isSaving, error, onClose, onSubmit }) {
  const [values, setValues] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    adresse: user?.adresse || '',
    ville: user?.ville || '',
    role: user?.role || roles[0]?.identifiant || '',
    agenceId: '',
    password: '',
    passwordConfirmation: '',
  });
  const [formError, setFormError] = useState('');
  const selectedRole = roles.find((role) => role.identifiant === values.role);
  const roleRequiresAgency = AGENCY_ROLES.has(values.role);
  const roleChanged = Boolean(user && values.role !== user.role);
  const agencyIdRequired = roleRequiresAgency && (!user || roleChanged);

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (agencyIdRequired && !values.agenceId.trim()) {
      setFormError('Renseignez l’identifiant numérique de l’agence pour ce rôle.');
      return;
    }

    if (values.agenceId && !/^[1-9]\d*$/.test(values.agenceId)) {
      setFormError('L’identifiant de l’agence doit être un entier positif.');
      return;
    }

    if (values.password && values.password !== values.passwordConfirmation) {
      setFormError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    const payload = {
      nom: values.nom.trim(),
      prenom: values.prenom.trim(),
      email: values.email.trim(),
      telephone: values.telephone.trim(),
      adresse: values.adresse.trim(),
      ville: values.ville.trim(),
    };

    if (!user || roleChanged) {
      payload.role = values.role;
    }

    if (values.agenceId) {
      payload.agence_id = Number(values.agenceId);
    } else if (roleChanged && !roleRequiresAgency) {
      payload.agence_id = null;
    }

    if (!user || values.password) {
      payload.password = values.password;
      payload.password_confirmation = values.passwordConfirmation;
    }

    const saved = await onSubmit({ uuid: user?.uuid, payload });
    if (saved) {
      onClose();
    }
  };

  return (
    <div
      className="users-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="user-form-title"
        aria-modal="true"
        className="users-modal users-form-modal"
        role="dialog"
      >
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">{user ? 'Profil utilisateur' : 'Administration'}</p>
            <h2 id="user-form-title">{user ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}</h2>
          </div>
          <button
            aria-label="Fermer"
            className="users-icon-button"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="users-form" onSubmit={handleSubmit}>
          <div className="users-form-grid">
            <label>
              <span>Prénom</span>
              <input autoComplete="given-name" maxLength="255" name="prenom" onChange={updateValue} required value={values.prenom} />
            </label>
            <label>
              <span>Nom</span>
              <input autoComplete="family-name" maxLength="255" name="nom" onChange={updateValue} required value={values.nom} />
            </label>
            <label className="users-form-wide">
              <span>Adresse e-mail</span>
              <input autoComplete="email" maxLength="255" name="email" onChange={updateValue} required type="email" value={values.email} />
            </label>
            <label>
              <span>Téléphone</span>
              <input autoComplete="tel" maxLength="255" name="telephone" onChange={updateValue} required value={values.telephone} />
            </label>
            <label>
              <span>Ville</span>
              <input autoComplete="address-level2" maxLength="255" name="ville" onChange={updateValue} required value={values.ville} />
            </label>
            <label className="users-form-wide">
              <span>Adresse</span>
              <input autoComplete="street-address" maxLength="255" name="adresse" onChange={updateValue} required value={values.adresse} />
            </label>
            <label className="users-form-wide">
              <span>Rôle</span>
              <select disabled={!roles.length} name="role" onChange={updateValue} required value={values.role}>
                {roles.map((role) => (
                  <option key={role.identifiant} value={role.identifiant}>
                    {role.libelle}
                  </option>
                ))}
              </select>
            </label>
            {roleRequiresAgency && (
              <label className="users-form-wide">
                <span>
                  Identifiant de l’agence{agencyIdRequired ? ' (obligatoire)' : ' (facultatif)'}
                </span>
                <input
                  inputMode="numeric"
                  min="1"
                  name="agenceId"
                  onChange={updateValue}
                  placeholder="ID numérique fourni par le système"
                  type="number"
                  value={values.agenceId}
                />
              </label>
            )}
            <label className="users-form-wide">
              <span>{user ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}</span>
              <input
                autoComplete="new-password"
                minLength="8"
                name="password"
                onChange={updateValue}
                required={!user}
                type="password"
                value={values.password}
              />
            </label>
            {(values.password || !user) && (
              <label className="users-form-wide">
                <span>Confirmation du mot de passe</span>
                <input
                  autoComplete="new-password"
                  minLength="8"
                  name="passwordConfirmation"
                  onChange={updateValue}
                  required
                  type="password"
                  value={values.passwordConfirmation}
                />
              </label>
            )}
          </div>

          {roleRequiresAgency && (
            <p className="users-form-hint">
              L’API de gestion des agences n’est pas encore disponible. Le backend
              attend un <code>agence_id</code> numérique; vérifiez cet ID avant
              l’enregistrement.
            </p>
          )}

          {selectedRole && (
            <div className="users-role-preview">
              <strong>{selectedRole.libelle}</strong>
              <p>{selectedRole.description}</p>
              <details>
                <summary>{selectedRole.permissions.length} permissions attribuées par ce rôle</summary>
                <ul>
                  {selectedRole.permissions.map((permission) => (
                    <li key={permission.id}>
                      <span>{permission.moduleLibelle}</span>
                      {permission.libelle}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {(formError || error) && (
            <p className="users-inline-error" role="alert">
              {formError || error}
            </p>
          )}

          <footer className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">
              Annuler
            </button>
            <button className="users-button users-button-primary" disabled={isSaving || roles.length === 0} type="submit">
              {isSaving ? 'Enregistrement…' : user ? 'Enregistrer' : 'Créer l’utilisateur'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default UserForm;
