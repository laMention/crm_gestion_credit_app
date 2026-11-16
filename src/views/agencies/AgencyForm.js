import { useState } from 'react';

function AgencyForm({ agency, isSaving, error, onClose, onSubmit }) {
  const [values, setValues] = useState({
    code: agency?.code || '',
    name: agency?.name || '',
    address: agency?.address || '',
    city: agency?.city || '',
    phone: agency?.phone || '',
    email: agency?.email || '',
    active: agency?.active ?? true,
  });

  const updateValue = (event) => {
    const { name, value, checked, type } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      code_agence: values.code.trim(),
      nom_agence: values.name.trim(),
      adresse_agence: values.address.trim(),
      ville_agence: values.city.trim(),
      telephone_agence: values.phone.trim(),
      email_agence: values.email.trim(),
    };

    if (agency) {
      payload.actif = values.active;
    }

    const saved = await onSubmit({ uuid: agency?.uuid, payload });
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
        aria-labelledby="agency-form-title"
        aria-modal="true"
        className="users-modal users-form-modal"
        role="dialog"
      >
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Administration du réseau</p>
            <h2 id="agency-form-title">
              {agency ? 'Modifier l’agence' : 'Nouvelle agence'}
            </h2>
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
              <span>Code agence</span>
              <input
                autoComplete="off"
                maxLength="10"
                name="code"
                onChange={updateValue}
                required
                value={values.code}
              />
            </label>
            <label>
              <span>Nom de l’agence</span>
              <input
                maxLength="255"
                name="name"
                onChange={updateValue}
                required
                value={values.name}
              />
            </label>
            <label className="users-form-wide">
              <span>Adresse</span>
              <input
                autoComplete="street-address"
                maxLength="255"
                name="address"
                onChange={updateValue}
                required
                value={values.address}
              />
            </label>
            <label>
              <span>Ville</span>
              <input
                autoComplete="address-level2"
                maxLength="255"
                name="city"
                onChange={updateValue}
                required
                value={values.city}
              />
            </label>
            <label>
              <span>Téléphone</span>
              <input
                autoComplete="tel"
                maxLength="255"
                name="phone"
                onChange={updateValue}
                required
                value={values.phone}
              />
            </label>
            <label className="users-form-wide">
              <span>Adresse e-mail</span>
              <input
                autoComplete="email"
                maxLength="255"
                name="email"
                onChange={updateValue}
                required
                type="email"
                value={values.email}
              />
            </label>
            {agency ? (
              <label className="users-form-wide agency-active-toggle">
                <input
                  checked={values.active}
                  name="active"
                  onChange={updateValue}
                  type="checkbox"
                />
                <span>Agence active</span>
              </label>
            ) : (
              <p className="users-form-hint">
                Une nouvelle agence est créée avec le statut actif.
              </p>
            )}
          </div>

          {agency && (
            <p className="users-form-hint">
              La désactivation empêche les nouvelles affectations d’utilisateurs,
              sans bloquer les utilisateurs déjà rattachés.
            </p>
          )}

          {error && <p className="users-inline-error" role="alert">{error}</p>}

          <footer className="users-modal-actions">
            <button
              className="users-button users-button-secondary"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="users-button users-button-primary"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default AgencyForm;
