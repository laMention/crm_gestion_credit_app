import { useState } from 'react';
import useClientsViewModel from '../../viewmodels/useClientsViewModel';
import ClientForm from './ClientForm';
import './ClientsView.css';

const CLIENT_STATUS_LABELS = {
  actif: 'Actif',
  inactif: 'Inactif',
  bloque: 'Bloqué',
};

const countFormatter = new Intl.NumberFormat('fr-FR');
const incomeFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});

function initials(client) {
  return `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toLocaleUpperCase('fr-FR');
}

function formatDate(value) {
  if (!value) {
    return 'Non renseignée';
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Non renseignée';
  }

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

function ClientDetail({ client, canEdit, onBack, onEdit }) {
  return (
    <section aria-labelledby="client-detail-title" className="clients-page">
      <header className="clients-page-heading">
        <div>
          <p className="users-breadcrumb">
            <button className="clients-text-button" onClick={onBack} type="button">
              Clients
            </button>
            {' › '}
            {client.firstName} {client.lastName}
          </p>
          <h1 id="client-detail-title">Fiche client</h1>
        </div>
        <div className="clients-heading-actions">
          <button className="users-button users-button-secondary" onClick={onBack} type="button">
            Retour à la liste
          </button>
          {canEdit && (
            <button className="users-button users-button-primary" onClick={onEdit} type="button">
              Modifier
            </button>
          )}
        </div>
      </header>

      <article className="clients-profile-card">
        <div className="clients-profile-identity">
          <span aria-hidden="true" className="clients-avatar clients-avatar-large">
            {initials(client)}
          </span>
          <div>
            <p className="users-eyebrow">{client.code}</p>
            <h2>{client.firstName} {client.lastName}</h2>
            <span className={`clients-status clients-status-${client.status}`}>
              <span aria-hidden="true" />
              {CLIENT_STATUS_LABELS[client.status] || client.status}
            </span>
          </div>
        </div>
        <dl className="clients-profile-fields">
          <div><dt>E-mail</dt><dd>{client.email}</dd></div>
          <div><dt>Téléphone</dt><dd>{client.phone}</dd></div>
          <div><dt>Adresse</dt><dd>{client.address}</dd></div>
          <div><dt>Ville</dt><dd>{client.city}</dd></div>
          <div><dt>Date de naissance</dt><dd>{formatDate(client.birthDate)}</dd></div>
          <div><dt>Lieu de naissance</dt><dd>{client.birthPlace || 'Non renseigné'}</dd></div>
          <div><dt>Sexe</dt><dd>{client.gender || 'Non renseigné'}</dd></div>
          <div><dt>Profession</dt><dd>{client.profession || 'Non renseignée'}</dd></div>
          <div><dt>Revenu mensuel</dt><dd>{client.monthlyIncome ? incomeFormatter.format(Number(client.monthlyIncome)) : 'Non renseigné'}</dd></div>
          <div><dt>Agence</dt><dd>{client.agency?.name || 'Non renseignée'}</dd></div>
          <div><dt>Comptes associés</dt><dd>{countFormatter.format(client.accountCount)}</dd></div>
        </dl>
      </article>
    </section>
  );
}

function ClientsView({ user, permissions }) {
  const viewModel = useClientsViewModel();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formClient, setFormClient] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = permissions.some((permission) => permission.id === 'clients.creer');
  const canEdit = permissions.some((permission) => permission.id === 'clients.modifier');
  const canViewDetail = permissions.some((permission) => permission.id === 'clients.consulter');

  const submitFilters = (event) => {
    event.preventDefault();
    viewModel.applyFilters({ search: search.trim(), status });
  };

  const closeForm = () => {
    setFormClient(null);
    setIsCreating(false);
  };

  const openCreateForm = () => {
    setFormClient(null);
    setIsCreating(true);
  };

  const openEditForm = () => {
    setFormClient(viewModel.selectedClient);
    setIsCreating(false);
  };

  const viewClient = viewModel.selectedClientUuid !== '';

  return (
    <>
      {viewClient ? (
        viewModel.isLoadingDetail ? (
          <p aria-live="polite" className="clients-loading" role="status">
            Chargement de la fiche client…
          </p>
        ) : viewModel.detailError ? (
          <div className="users-notice users-notice-error" role="alert">
            <span>{viewModel.detailError}</span>
            <button onClick={viewModel.retry} type="button">Réessayer</button>
            <button onClick={viewModel.backToList} type="button">Retour à la liste</button>
          </div>
        ) : viewModel.selectedClient ? (
          <ClientDetail
            canEdit={canEdit}
            client={viewModel.selectedClient}
            onBack={viewModel.backToList}
            onEdit={openEditForm}
          />
        ) : null
      ) : (
        <section aria-labelledby="clients-title" className="clients-page">
          <header className="clients-page-heading">
            <div>
              <p className="users-breadcrumb">Accueil&nbsp; › &nbsp;Clients</p>
              <h1 id="clients-title">Clients</h1>
              <p>
                {countFormatter.format(viewModel.meta.total)}
                {' clients · '}
                {user.agence?.nom || 'Toutes les agences'}
              </p>
            </div>
            {canCreate && (
              <button
                className="users-button users-button-primary"
                onClick={openCreateForm}
                type="button"
              >
                <span aria-hidden="true">＋</span> Nouveau client
              </button>
            )}
          </header>

          {viewModel.error && (
            <div className="users-notice users-notice-error" role="alert">
              <span>{viewModel.error}</span>
              <button onClick={viewModel.retry} type="button">Réessayer</button>
            </div>
          )}
          {viewModel.notice && (
            <p className="users-notice users-notice-success" role="status">
              {viewModel.notice}
            </p>
          )}

          <section aria-label="Filtres clients" className="users-card">
            <form className="users-filters clients-filters" onSubmit={submitFilters}>
              <label className="users-search">
                <span aria-hidden="true" className="users-search-icon">⌕</span>
                <span className="users-visually-hidden">Rechercher un client</span>
                <input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom, numéro client, téléphone, e-mail…"
                  type="search"
                  value={search}
                />
              </label>
              <label className="users-filter-select">
                <span className="users-visually-hidden">Filtrer par statut</span>
                <select
                  aria-label="Filtrer par statut"
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  <option value="">Statut : tous</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="bloque">Bloqué</option>
                </select>
              </label>
              <button className="users-button users-button-secondary" type="submit">
                Rechercher
              </button>
              <button
                className="clients-reset-button"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  viewModel.applyFilters({ search: '', status: '' });
                }}
                type="button"
              >
                Réinitialiser
              </button>
            </form>

            <div className="users-table-scroll">
              <table className="users-table clients-table">
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">N° client</th>
                    <th scope="col">Téléphone</th>
                    <th scope="col">Agence</th>
                    <th scope="col">Comptes</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.clients.map((client) => (
                    <tr key={client.uuid}>
                      <td>
                        <span className="clients-table-person">
                          <span aria-hidden="true" className="clients-avatar">
                            {initials(client)}
                          </span>
                          <span>
                            <strong>{client.firstName} {client.lastName}</strong>
                            <small>{client.email}</small>
                          </span>
                        </span>
                      </td>
                      <td>{client.code}</td>
                      <td>{client.phone}</td>
                      <td>{client.agency?.name || user.agence?.nom || '—'}</td>
                      <td>{countFormatter.format(client.accountCount)}</td>
                      <td>
                        <span className={`clients-status clients-status-${client.status}`}>
                          <span aria-hidden="true" />
                          {CLIENT_STATUS_LABELS[client.status] || client.status}
                        </span>
                      </td>
                      <td>
                        <div className="clients-row-actions">
                          {canViewDetail && (
                            <button
                              aria-label={`Voir la fiche de ${client.firstName} ${client.lastName}`}
                              className="users-row-button"
                              onClick={() => viewModel.showClient(client.uuid)}
                              type="button"
                            >
                              Voir la fiche
                            </button>
                          )}
                          {canEdit && (
                            <button
                              aria-label={`Modifier ${client.firstName} ${client.lastName}`}
                              className="users-row-button"
                              onClick={() => {
                                viewModel.showClient(client.uuid);
                                setFormClient(client);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!viewModel.isLoading && viewModel.clients.length === 0 && (
                    <tr>
                      <td className="clients-empty" colSpan="7">
                        Aucun client ne correspond à ces critères.
                      </td>
                    </tr>
                  )}
                  {viewModel.isLoading && (
                    <tr>
                      <td className="clients-empty" colSpan="7">
                        Chargement des clients…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="clients-pagination">
              <span>
                {viewModel.meta.total === 0
                  ? 'Aucun client'
                  : `Affichage ${(viewModel.meta.currentPage - 1) * viewModel.meta.perPage + 1}–${Math.min(
                    viewModel.meta.currentPage * viewModel.meta.perPage,
                    viewModel.meta.total,
                  )} sur ${countFormatter.format(viewModel.meta.total)} clients`}
              </span>
              <div>
                <button
                  aria-label="Page précédente"
                  disabled={viewModel.page <= 1 || viewModel.isLoading}
                  onClick={() => viewModel.setPage((currentPage) => currentPage - 1)}
                  type="button"
                >
                  ‹
                </button>
                <span>Page {viewModel.meta.currentPage} sur {viewModel.meta.lastPage}</span>
                <button
                  aria-label="Page suivante"
                  disabled={viewModel.page >= viewModel.meta.lastPage || viewModel.isLoading}
                  onClick={() => viewModel.setPage((currentPage) => currentPage + 1)}
                  type="button"
                >
                  ›
                </button>
              </div>
            </footer>
          </section>
        </section>
      )}

      {(isCreating || formClient) && (
        <ClientForm
          client={formClient}
          error={viewModel.actionError}
          isSaving={viewModel.isSaving}
          onClose={closeForm}
          onSubmit={viewModel.saveClient}
        />
      )}
    </>
  );
}

export default ClientsView;
