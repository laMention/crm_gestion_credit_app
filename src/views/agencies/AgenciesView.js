import { useState } from 'react';
import useAgenciesViewModel from '../../viewmodels/useAgenciesViewModel';
import AgencyForm from './AgencyForm';
import './AgenciesView.css';

function hasPermission(permissions, id) {
  return permissions.some((permission) => permission.id === id);
}

function AgenciesView({ permissions }) {
  const viewModel = useAgenciesViewModel();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formAgency, setFormAgency] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = hasPermission(permissions, 'agences.creer');
  const canEdit = hasPermission(permissions, 'agences.modifier');

  const submitFilters = (event) => {
    event.preventDefault();
    viewModel.applyFilters({ search: search.trim(), status });
  };

  const closeForm = () => {
    setFormAgency(null);
    setIsCreating(false);
  };

  return (
    <section aria-labelledby="agencies-title" className="users-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">Administration&nbsp; › &nbsp;Agences</p>
          <h1 id="agencies-title">Gestion des agences</h1>
          <p>Consultez les agences de votre périmètre et gérez leurs informations.</p>
        </div>
        {canCreate && (
          <button
            className="users-button users-button-primary"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            <span aria-hidden="true">＋</span> Nouvelle agence
          </button>
        )}
      </header>

      {viewModel.error && (
        <div className="users-notice users-notice-error" role="alert">
          <span>{viewModel.error}</span>
          <button aria-label="Réessayer" onClick={viewModel.retry} type="button">
            Réessayer
          </button>
        </div>
      )}
      {viewModel.notice && (
        <p className="users-notice users-notice-success" role="status">
          {viewModel.notice}
        </p>
      )}

      <section aria-label="Filtres agences" className="users-card">
        <form className="users-filters agencies-filters" onSubmit={submitFilters}>
          <label className="users-search">
            <span className="users-search-icon" aria-hidden="true">⌕</span>
            <span className="users-visually-hidden">Rechercher une agence</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Code, nom, ville ou e-mail…"
              type="search"
              value={search}
            />
          </label>
          <label className="users-filter-select">
            <span className="users-visually-hidden">Filtrer par statut</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">Tous les statuts</option>
              <option value="1">Actives</option>
              <option value="0">Inactives</option>
            </select>
          </label>
          <button className="users-button users-button-secondary" type="submit">
            Rechercher
          </button>
        </form>

        <div className="users-table-scroll">
          <table className="users-table agencies-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Agence</th>
                <th scope="col">Ville</th>
                <th scope="col">Téléphone</th>
                <th scope="col">Adresse e-mail</th>
                <th scope="col">Statut</th>
                {canEdit && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {viewModel.isLoading && (
                <tr>
                  <td className="users-empty" colSpan={canEdit ? 7 : 6}>
                    Chargement des agences…
                  </td>
                </tr>
              )}
              {!viewModel.isLoading && !viewModel.error && viewModel.agencies.length === 0 && (
                <tr>
                  <td className="users-empty" colSpan={canEdit ? 7 : 6}>
                    Aucune agence ne correspond à ces filtres.
                  </td>
                </tr>
              )}
              {!viewModel.isLoading && viewModel.agencies.map((agency) => (
                <tr key={agency.uuid}>
                  <td><code>{agency.code}</code></td>
                  <td>
                    <strong>{agency.name}</strong>
                    <small className="agencies-address">{agency.address}</small>
                  </td>
                  <td>{agency.city}</td>
                  <td>{agency.phone}</td>
                  <td>{agency.email}</td>
                  <td>
                    <span className={`users-status ${agency.active ? 'is-active' : 'is-inactive'}`}>
                      <span aria-hidden="true" />
                      {agency.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <button
                        className="users-row-button"
                        onClick={() => setFormAgency(agency)}
                        type="button"
                      >
                        Modifier
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="users-pagination">
          <span>
            {viewModel.meta.total === 0
              ? 'Aucune agence'
              : `Page ${viewModel.meta.currentPage} sur ${viewModel.meta.lastPage} · ${viewModel.meta.total} agence${viewModel.meta.total === 1 ? '' : 's'}`}
          </span>
          <div>
            <button
              aria-label="Page précédente"
              className="users-page-button"
              disabled={viewModel.page <= 1 || viewModel.isLoading}
              onClick={() => viewModel.setPage((currentPage) => currentPage - 1)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Page suivante"
              className="users-page-button"
              disabled={viewModel.page >= viewModel.meta.lastPage || viewModel.isLoading}
              onClick={() => viewModel.setPage((currentPage) => currentPage + 1)}
              type="button"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      <p className="users-security-note">
        Les autorisations et le périmètre d’agence sont vérifiés par l’API Laravel.
        Aucune suppression physique n’est proposée.
      </p>

      {(isCreating || formAgency) && (
        <AgencyForm
          key={formAgency?.uuid || 'new-agency'}
          agency={formAgency}
          error={viewModel.actionError}
          isSaving={viewModel.isSaving}
          onClose={closeForm}
          onSubmit={viewModel.saveAgency}
        />
      )}
    </section>
  );
}

export default AgenciesView;
