import LoginView from './LoginView';

function ProtectedRoute({ auth, children }) {
  if (auth.isInitializing) {
    return (
      <main aria-live="polite" className="auth-loading">
        <div className="auth-loading-card">
          <span aria-hidden="true" className="auth-spinner" />
          Vérification de votre session…
        </div>
      </main>
    );
  }

  if (auth.initializationError) {
    return (
      <main className="auth-loading">
        <section className="auth-session-card">
          <p className="auth-eyebrow">Vérification de session</p>
          <h1>Connexion au serveur impossible</h1>
          <p>{auth.initializationError}</p>
          <button
            className="auth-submit auth-retry"
            onClick={auth.retrySession}
            type="button"
          >
            Réessayer
          </button>
        </section>
      </main>
    );
  }

  if (!auth.user) {
    return (
      <LoginView
        error={auth.error}
        isSubmitting={auth.isSubmitting}
        onLogin={auth.login}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
