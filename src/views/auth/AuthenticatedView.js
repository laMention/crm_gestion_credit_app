function AuthenticatedView({ user, error, isLoggingOut, onLogout }) {
  return (
    <main className="auth-session-panel">
      <section aria-labelledby="session-title" className="auth-session-card">
        <span className="auth-brand-mark">
          <svg
            aria-hidden="true"
            fill="none"
            height="23"
            viewBox="0 0 24 24"
            width="23"
          >
            <path
              d="M3.5 9h17L12 4 3.5 9Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M5.5 19.5h13M4 21h16M6.5 10.5v7m3.7-7v7m3.6-7v7m3.7-7v7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <h1 id="session-title">Votre session est sécurisée.</h1>
        <p>Vous êtes connecté à l’espace collaborateur AtlasCredit.</p>

        <div className="auth-session-user">
          <strong>{`${user.prenom} ${user.nom}`}</strong>
          <span>{user.email}</span>
          <span>{user.role}</span>
          {user.agence && (
            <span>{`${user.agence.nom} · ${user.agence.ville || user.agence.code}`}</span>
          )}
        </div>

        {error && (
          <p className="auth-error auth-session-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="auth-logout"
          disabled={isLoggingOut}
          onClick={onLogout}
          type="button"
        >
          {isLoggingOut ? 'Déconnexion en cours…' : 'Se déconnecter'}
        </button>
      </section>
    </main>
  );
}

export default AuthenticatedView;
