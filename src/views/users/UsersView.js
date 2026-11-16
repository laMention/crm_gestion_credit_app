import { useState } from 'react';
import ApiError from '../../core/api/ApiError';
import useUsersViewModel from '../../viewmodels/useUsersViewModel';
import UserForm from './UserForm';
import './UsersView.css';

function hasPermission(permissions, id) {
  return permissions.some((permission) => permission.id === id);
}

function formatRole(role, roles) {
  return roles.find((item) => item.identifiant === role)?.libelle || role;
}

function formatDate(value) {
  if (!value) {
    return 'Jamais';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date indisponible';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function UserPermissionsDialog({ user, roleLabel, permissions, isLoading, error, onClose }) {
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const group = permission.module_libelle || permission.module || 'Autres';
    groups[group] = [...(groups[group] || []), permission];
    return groups;
  }, {});

  return (
    <div className="users-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    >
      <section
        aria-labelledby="user-permissions-title"
        aria-modal="true"
        className="users-modal users-permissions-modal"
        role="dialog"
      >
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Accès attribués par rôle</p>
            <h2 id="user-permissions-title">Permissions de {user.prenom} {user.nom}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" onClick={onClose} type="button">×</button>
        </header>

        {isLoading && <p className="users-loading-message">Chargement des permissions…</p>}
        {error && <p className="users-inline-error" role="alert">{error}</p>}
        {!isLoading && !error && (
          <>
            <p className="users-permissions-role">{roleLabel}</p>
            <div className="users-permissions-list">
              {Object.entries(groupedPermissions).map(([group, items]) => (
                <section key={group}>
                  <h3>{group}</h3>
                  <ul>
                    {items.map((permission) => (
                      <li key={permission.id}>
                        <span className="users-permission-check" aria-hidden="true">✓</span>
                        <span>{permission.libelle}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function UserStatusDialog({ user, isSaving, onCancel, onConfirm }) {
  const willDeactivate = user.actif;

  return (
    <div className="users-modal-backdrop">
      <section
        aria-labelledby="user-status-title"
        aria-modal="true"
        className="users-modal users-status-modal"
        role="dialog"
      >
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Confirmation requise</p>
            <h2 id="user-status-title">
              {willDeactivate ? 'Désactiver l’utilisateur ?' : 'Activer l’utilisateur ?'}
            </h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onCancel} type="button">×</button>
        </header>
        <div className="users-status-content">
          <p>
            {willDeactivate
              ? `Le compte de ${user.prenom} ${user.nom} sera désactivé et ses jetons de connexion seront révoqués.`
              : `Le compte de ${user.prenom} ${user.nom} pourra de nouveau se connecter.`}
          </p>
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onCancel} type="button">Annuler</button>
            <button
              className={`users-button ${willDeactivate ? 'users-button-danger' : 'users-button-primary'}`}
              disabled={isSaving}
              onClick={onConfirm}
              type="button"
            >
              {isSaving ? 'Traitement…' : willDeactivate ? 'Désactiver le compte' : 'Activer le compte'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function UsersView({ user, permissions }) {
  const viewModel = useUsersViewModel();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [status, setStatus] = useState('');
  const [formUser, setFormUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [permissionItems, setPermissionItems] = useState([]);
  const [permissionError, setPermissionError] = useState('');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const canCreate = hasPermission(permissions, 'utilisateurs.creer');
  const canEdit = hasPermission(permissions, 'utilisateurs.modifier');
  const canActivate = hasPermission(permissions, 'utilisateurs.activer');
  const canDeactivate = hasPermission(permissions, 'utilisateurs.desactiver');

  const submitFilters = (event) => {
    event.preventDefault();
    viewModel.applyFilters({ search: search.trim(), role, agencyId, status });
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) {
      return;
    }

    setIsChangingStatus(true);
    try {
      await viewModel.changeActiveState(statusTarget);
    } finally {
      setIsChangingStatus(false);
      setStatusTarget(null);
    }
  };

  const openPermissions = async (targetUser) => {
    setPermissionTarget(targetUser);
    setPermissionItems([]);
    setPermissionError('');
    setIsLoadingPermissions(true);

    try {
      const items = await viewModel.getPermissions(targetUser);
      setPermissionItems(items);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setPermissionError(requestError.message);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const closeForm = () => {
    setFormUser(null);
    setIsCreating(false);
  };

  return (
    <section aria-labelledby="users-title" className="users-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">Administration&nbsp; › &nbsp;Utilisateurs</p>
          <h1 id="users-title">Gestion des utilisateurs</h1>
          <p>Consultez les comptes, leurs rôles et leur statut dans votre périmètre.</p>
        </div>
        {canCreate && (
          <button className="users-button users-button-primary" disabled={viewModel.isLoadingRoles} onClick={() => setIsCreating(true)} type="button">
            <span aria-hidden="true">＋</span> Nouvel utilisateur
          </button>
        )}
      </header>

      {viewModel.error && (
        <div className="users-notice users-notice-error" role="alert">
          <span>{viewModel.error}</span>
          <button aria-label="Réessayer" onClick={viewModel.retry} type="button">Réessayer</button>
        </div>
      )}
      {viewModel.notice && <p className="users-notice users-notice-success" role="status">{viewModel.notice}</p>}

      <section aria-label="Filtres utilisateurs" className="users-card">
        <form className="users-filters" onSubmit={submitFilters}>
          <label className="users-search">
            <span className="users-search-icon" aria-hidden="true">⌕</span>
            <span className="users-visually-hidden">Rechercher un utilisateur</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, prénom, e-mail ou téléphone…"
              type="search"
              value={search}
            />
          </label>
          <label className="users-filter-select">
            <span className="users-visually-hidden">Filtrer par rôle</span>
            <select onChange={(event) => setRole(event.target.value)} value={role}>
              <option value="">Tous les rôles</option>
              {viewModel.roles.map((item) => (
                <option key={item.identifiant} value={item.identifiant}>{item.libelle}</option>
              ))}
            </select>
          </label>
          <label className="users-filter-select">
            <span className="users-visually-hidden">Filtrer par agence</span>
            <select onChange={(event) => setAgencyId(event.target.value)} value={agencyId}>
              <option value="">Toutes les agences</option>
              {viewModel.agencies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.code}{item.active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </label>
          <label className="users-filter-select">
            <span className="users-visually-hidden">Filtrer par statut</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">Tous les statuts</option>
              <option value="1">Actifs</option>
              <option value="0">Désactivés</option>
            </select>
          </label>
          <button className="users-button users-button-secondary" type="submit">Rechercher</button>
        </form>

        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Utilisateur</th>
                <th scope="col">Téléphone</th>
                <th scope="col">Agence</th>
                <th scope="col">Rôle</th>
                <th scope="col">Dernière connexion</th>
                <th scope="col">Statut</th>
                <th scope="col"><span className="users-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {viewModel.isLoading && (
                <tr><td className="users-empty" colSpan="7">Chargement des utilisateurs…</td></tr>
              )}
              {!viewModel.isLoading && !viewModel.error && viewModel.users.length === 0 && (
                <tr><td className="users-empty" colSpan="7">Aucun utilisateur ne correspond à ces filtres.</td></tr>
              )}
              {!viewModel.isLoading && viewModel.users.map((item) => {
                const isSelf = item.uuid === user.uuid;

                return (
                  <tr key={item.uuid}>
                    <td>
                      <div className="users-person">
                        <span aria-hidden="true" className="users-avatar">
                          {`${item.prenom[0] || ''}${item.nom[0] || ''}`.toUpperCase()}
                        </span>
                        <span>
                          <strong>{item.prenom} {item.nom}</strong>
                          <small>{item.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{item.telephone || '—'}</td>
                    <td>
                      {item.agence
                        ? <span>{item.agence.nom}<small>{item.agence.code} · {item.agence.ville || 'Ville non renseignée'}{item.agence.active ? '' : ' · inactive'}</small></span>
                        : 'Réseau'}
                    </td>
                    <td><span className="users-role-badge">{formatRole(item.role, viewModel.roles)}</span></td>
                    <td>{formatDate(item.derniereConnexion)}</td>
                    <td>
                      <span className={`users-status ${item.actif ? 'is-active' : 'is-inactive'}`}>
                        <span aria-hidden="true" />
                        {item.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td>
                      <div className="users-row-actions">
                        <button
                          className="users-row-button"
                          onClick={() => openPermissions(item)}
                          type="button"
                        >
                          Permissions
                        </button>
                        {canEdit && (
                          <button
                            className="users-row-button"
                            onClick={() => setFormUser(item)}
                            type="button"
                          >
                            Modifier
                          </button>
                        )}
                        {item.actif && canDeactivate && !isSelf && (
                          <button className="users-row-button is-danger" onClick={() => setStatusTarget(item)} type="button">
                            Désactiver
                          </button>
                        )}
                        {!item.actif && canActivate && (
                          <button className="users-row-button is-positive" onClick={() => setStatusTarget(item)} type="button">
                            Activer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="users-pagination">
          <span>
            {viewModel.meta.total === 0
              ? 'Aucun utilisateur'
              : `Page ${viewModel.meta.currentPage} sur ${viewModel.meta.lastPage} · ${viewModel.meta.total} utilisateur${viewModel.meta.total === 1 ? '' : 's'}`}
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
        Les autorisations sont appliquées et vérifiées par l’API Laravel; les rôles
        proposés correspondent au catalogue du serveur.
      </p>

      {(isCreating || formUser) && (
        <UserForm
          key={formUser?.uuid || 'new-user'}
          error={viewModel.actionError}
          agencies={viewModel.agencies}
          isLoadingAgencies={viewModel.isLoadingAgencies}
          isSaving={viewModel.isSaving}
          onClose={closeForm}
          onSubmit={viewModel.saveUser}
          roles={viewModel.roles}
          user={formUser}
        />
      )}

      {permissionTarget && (
        <UserPermissionsDialog
          error={permissionError}
          isLoading={isLoadingPermissions}
          onClose={() => setPermissionTarget(null)}
          permissions={permissionItems}
          roleLabel={formatRole(permissionTarget.role, viewModel.roles)}
          user={permissionTarget}
        />
      )}
      {statusTarget && (
        <UserStatusDialog
          isSaving={isChangingStatus}
          onCancel={() => setStatusTarget(null)}
          onConfirm={confirmStatusChange}
          user={statusTarget}
        />
      )}
    </section>
  );
}

export default UsersView;
