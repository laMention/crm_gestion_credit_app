import { useState } from 'react';
import UsersView from '../users/UsersView';
import DashboardView from '../dashboard/DashboardView';
import ClientsView from '../clients/ClientsView';

function BrandMark() {
  return (
    <span className="auth-brand-mark">
      <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
        <path d="M3.5 9h17L12 4 3.5 9Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
        <path d="M5.5 19.5h13M4 21h16M6.5 10.5v7m3.7-7v7m3.6-7v7m3.7-7v7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      </svg>
    </span>
  );
}

function AuthenticatedView({ user, permissions, error, isLoggingOut, onLogout }) {
  const canViewDashboard = permissions.some(
    (permission) => permission.id === 'reportings.consulter_tout',
  );
  const canViewTransactions = permissions.some(
    (permission) => permission.id === 'transactions.consulter_tout',
  );
  const canViewClients = permissions.some(
    (permission) => permission.id === 'clients.consulter_tout',
  );
  const [activePage, setActivePage] = useState(
    canViewDashboard
      ? 'dashboard'
      : canViewClients
        ? 'clients'
        : 'home',
  );
  const canViewUsers = permissions.some(
    (permission) => permission.id === 'utilisateurs.consulter_tout',
  );

  return (
    <div className="crm-app">
      <aside className="crm-sidebar">
        <div className="crm-sidebar-brand">
          <BrandMark />
          <span>
            <strong>AtlasCredit</strong>
            <small>Crédit &amp; opérations</small>
          </span>
        </div>
        {(canViewDashboard || canViewClients) && (
          <>
            <p className="crm-sidebar-section">ACTIVITÉ</p>
            {canViewDashboard && (
              <button
                aria-current={activePage === 'dashboard' ? 'page' : undefined}
                className={`crm-sidebar-link${activePage === 'dashboard' ? ' is-active' : ''}`}
                onClick={() => setActivePage('dashboard')}
                type="button"
              >
                <span aria-hidden="true" className="crm-sidebar-link-icon">▦</span>
                Tableau de bord
              </button>
            )}
            {canViewClients && (
              <button
                aria-current={activePage === 'clients' ? 'page' : undefined}
                className={`crm-sidebar-link${activePage === 'clients' ? ' is-active' : ''}`}
                onClick={() => setActivePage('clients')}
                type="button"
              >
                <span aria-hidden="true" className="crm-sidebar-link-icon">♙</span>
                Clients
              </button>
            )}
          </>
        )}
        {canViewUsers && <p className="crm-sidebar-section">ADMINISTRATION</p>}
        {canViewUsers && (
          <button
            aria-current={activePage === 'users' ? 'page' : undefined}
            className={`crm-sidebar-link${activePage === 'users' ? ' is-active' : ''}`}
            onClick={() => setActivePage('users')}
            type="button"
          >
            <span aria-hidden="true" className="crm-sidebar-link-icon">♙</span>
            Gestion des utilisateurs
          </button>
        )}
        <div className="crm-sidebar-user">
          <div className="crm-sidebar-user-card">
            <span>Session connectée</span>
            <strong>{`${user.prenom} ${user.nom}`}</strong>
            <small>{user.agence?.nom || 'Accès réseau'}</small>
          </div>
        </div>
      </aside>

      <header className="crm-topbar">
        <span className="crm-topbar-label">
          {activePage === 'users'
            ? 'Administration · Utilisateurs'
            : activePage === 'dashboard'
              ? 'Activité · Tableau de bord'
              : activePage === 'clients'
                ? 'Activité · Clients'
              : 'Espace collaborateur'}
        </span>
        <div className="crm-topbar-account">
          <span className="crm-topbar-identity">
            <strong>{`${user.prenom} ${user.nom}`}</strong>
            <small>{user.role.replace(/_/g, ' ')}</small>
          </span>
          <button
            className="crm-logout"
            disabled={isLoggingOut}
            onClick={onLogout}
            type="button"
          >
            {isLoggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </header>

      <main className="crm-main">
        {activePage === 'dashboard' && canViewDashboard ? (
          <DashboardView canViewTransactions={canViewTransactions} />
        ) : activePage === 'clients' && canViewClients ? (
          <ClientsView user={user} permissions={permissions} />
        ) : activePage === 'users' && canViewUsers ? (
          <UsersView permissions={permissions} user={user} />
        ) : (
          <section aria-labelledby="session-title" className="crm-home-card">
            <p className="users-eyebrow">Espace collaborateur</p>
            <h1 id="session-title">Votre session est sécurisée.</h1>
            <p>Vous êtes connecté à l’espace collaborateur AtlasCredit.</p>
            <div className="crm-home-user">
              <strong>{`${user.prenom} ${user.nom}`}</strong>
              <span>{user.email}</span>
              <span>{user.role.replace(/_/g, ' ')}</span>
              {user.agence && (
                <span>{`${user.agence.nom} · ${user.agence.ville || user.agence.code}`}</span>
              )}
            </div>
            {canViewUsers ? (
              <button
                className="users-button users-button-primary"
                onClick={() => setActivePage('users')}
                type="button"
              >
                Ouvrir la gestion des utilisateurs
              </button>
            ) : (
              <p>Votre rôle ne donne pas accès à la gestion des utilisateurs.</p>
            )}
            {canViewDashboard && (
              <button
                className="users-button users-button-primary"
                onClick={() => setActivePage('dashboard')}
                type="button"
              >
                Ouvrir le tableau de bord
              </button>
            )}
            {canViewClients && (
              <button
                className="users-button users-button-primary"
                onClick={() => setActivePage('clients')}
                type="button"
              >
                Ouvrir la gestion des clients
              </button>
            )}
            {error && <p className="auth-error crm-home-error" role="alert">{error}</p>}
          </section>
        )}
      </main>
    </div>
  );
}

export default AuthenticatedView;
