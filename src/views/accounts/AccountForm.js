import { useEffect, useState } from 'react';
import ApiError from '../../core/api/ApiError';
import * as clientService from '../../services/clientService';

function AccountForm({ error, isSaving, onClose, onSubmit }) {
  const [clients, setClients] = useState([]);
  const [clientUuid, setClientUuid] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [type, setType] = useState('courant');
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadClients() {
      try {
        const result = await clientService.listClients({ status: 'actif', page: 1, perPage: 100 });
        if (isCurrent) {
          setClients(result.clients);
          setClientUuid(result.clients[0]?.uuid || '');
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) {
          throw requestError;
        }
        if (isCurrent) {
          setClientError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingClients(false);
        }
      }
    }

    void loadClients();
    return () => {
      isCurrent = false;
    };
  }, []);

  const searchClients = async () => {
    setIsSearchingClients(true);
    setClientError('');
    try {
      const result = await clientService.listClients({
        search: clientSearch.trim(),
        status: 'actif',
        page: 1,
        perPage: 100,
      });
      setClients(result.clients);
      setClientUuid((currentUuid) => (
        result.clients.some((client) => client.uuid === currentUuid)
          ? currentUuid
          : result.clients[0]?.uuid || ''
      ));
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }
      setClientError(requestError.message);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const succeeded = await onSubmit({ clientUuid, type });
    if (succeeded) {
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
      <section aria-labelledby="account-form-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Nouveau compte client</p>
            <h2 id="account-form-title">Ouvrir un compte</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>

        <form className="users-form account-form" onSubmit={submit}>
          <label>
            Rechercher un client
            <span className="account-client-search">
              <input
                onChange={(event) => setClientSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchClients();
                  }
                }}
                placeholder="Nom, code client, téléphone…"
                type="search"
                value={clientSearch}
              />
              <button className="users-button users-button-secondary" disabled={isSearchingClients} onClick={() => void searchClients()} type="button">
                {isSearchingClients ? 'Recherche…' : 'Rechercher'}
              </button>
            </span>
          </label>
          <label>
            Client actif
            <select
              disabled={isLoadingClients || clients.length === 0 || isSaving}
              onChange={(event) => setClientUuid(event.target.value)}
              required
              value={clientUuid}
            >
              {clients.length === 0 && <option value="">Aucun client actif disponible</option>}
              {clients.map((client) => (
                <option key={client.uuid} value={client.uuid}>
                  {client.firstName} {client.lastName} · {client.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type de compte
            <select disabled={isSaving} onChange={(event) => setType(event.target.value)} value={type}>
              <option value="courant">Compte courant</option>
              <option value="credit">Compte de crédit</option>
              <option value="epargne">Compte épargne</option>
            </select>
          </label>

          <p className="account-form-note">
            Le numéro, l’agence, le solde et la date d’ouverture sont déterminés par le serveur.
            Les comptes de crédit peuvent aussi être ouverts ici, puis utilisés dans une demande.
          </p>
          {(clientError || error) && (
            <p className="users-inline-error" role="alert">{clientError || error}</p>
          )}
          {isLoadingClients && <p className="account-form-note" role="status">Chargement des clients actifs…</p>}

          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button
              className="users-button users-button-primary"
              disabled={isSaving || isLoadingClients || !clientUuid}
              type="submit"
            >
              {isSaving ? 'Ouverture…' : 'Ouvrir le compte'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AccountForm;
