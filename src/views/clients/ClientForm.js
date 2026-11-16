import { useState } from 'react';

function ClientForm({ client, isSaving, error, onClose, onSubmit }) {
  const [values, setValues] = useState({
    lastName: client?.lastName || '',
    firstName: client?.firstName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    birthDate: client?.birthDate || '',
    birthPlace: client?.birthPlace || '',
    gender: client?.gender || '',
    profession: client?.profession || '',
  });

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      nom_client: values.lastName.trim(),
      prenom_client: values.firstName.trim(),
      adresse_client: values.address.trim(),
      telephone_client: values.phone.trim(),
      ville_client: values.city.trim(),
      email_client: values.email.trim(),
      date_naissance: values.birthDate || null,
      lieu_naissance: values.birthPlace.trim() || null,
      sexe: values.gender.trim() || null,
      profession: values.profession.trim() || null,
    };

    const saved = await onSubmit({ uuid: client?.uuid, payload });
    if (saved) {
      onClose();
    }
  };

  return (
    <div
      className="clients-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="client-form-title"
        aria-modal="true"
        className="clients-modal"
        role="dialog"
      >
        <header className="clients-modal-header">
          <div>
            <p className="users-eyebrow">Dossier client</p>
            <h2 id="client-form-title">
              {client ? 'Modifier le client' : 'Nouveau client'}
            </h2>
          </div>
          <button
            aria-label="Fermer"
            className="clients-icon-button"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="clients-form" onSubmit={handleSubmit}>
          <div className="clients-form-grid">
            <label>
              <span>Prénom</span>
              <input
                autoComplete="given-name"
                maxLength="255"
                name="firstName"
                onChange={updateValue}
                required
                value={values.firstName}
              />
            </label>
            <label>
              <span>Nom</span>
              <input
                autoComplete="family-name"
                maxLength="255"
                name="lastName"
                onChange={updateValue}
                required
                value={values.lastName}
              />
            </label>
            <label className="clients-form-wide">
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
            <label className="clients-form-wide">
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
              <span>Date de naissance</span>
              <input
                name="birthDate"
                onChange={updateValue}
                type="date"
                value={values.birthDate}
              />
            </label>
            <label>
              <span>Lieu de naissance</span>
              <input
                maxLength="255"
                name="birthPlace"
                onChange={updateValue}
                value={values.birthPlace}
              />
            </label>
            <label>
              <span>Sexe</span>
              <input
                maxLength="10"
                name="gender"
                onChange={updateValue}
                value={values.gender}
              />
            </label>
            <label>
              <span>Profession</span>
              <input
                maxLength="255"
                name="profession"
                onChange={updateValue}
                value={values.profession}
              />
            </label>
          </div>

          <p className="clients-form-hint">
            Le code client, l’agence et le statut sont définis par le système.
          </p>
          {error && (
            <p className="clients-inline-error" role="alert">
              {error}
            </p>
          )}
          <footer className="clients-modal-actions">
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
              {isSaving
                ? 'Enregistrement…'
                : client
                  ? 'Enregistrer les modifications'
                  : 'Créer le client'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default ClientForm;
