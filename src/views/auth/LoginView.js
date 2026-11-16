import { useState } from 'react';

function BrandMark({ light = false }) {
  return (
    <span className={`auth-brand-mark${light ? ' auth-brand-mark-light' : ''}`}>
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
  );
}

function FieldIcon({ type }) {
  if (type === 'email') {
    return (
      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
        <rect height="12" rx="2" stroke="currentColor" strokeWidth="1.6" width="16" x="2" y="4" />
        <path d="m3 5 7 5 7-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <rect height="9" rx="2" stroke="currentColor" strokeWidth="1.6" width="13" x="3.5" y="8.5" />
      <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <circle cx="10" cy="12.8" fill="currentColor" r="1" />
    </svg>
  );
}

function BenefitIcon({ type }) {
  const paths = {
    shield: <path d="M12 3 5 6v5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6l-7-3Zm0 4v9" />,
    journal: <><rect height="14" rx="2" width="12" x="6" y="5" /><path d="M9 9h6m-6 3h6m-6 3h4M9 3h6" /></>,
    access: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M6 8v3h12V8m-6 3v5" /></>,
  };

  return (
    <span className="auth-benefit-icon">
      <svg
        aria-hidden="true"
        fill="none"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
        width="20"
      >
        {paths[type]}
      </svg>
    </span>
  );
}

function LoginView({ error, isSubmitting, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLogin({ email, password }, remember);
  };

  return (
    <div className="auth-page">
      <main className="auth-main">
        <section aria-label="Présentation d’AtlasCredit" className="auth-brand-panel">
          <div className="auth-brand">
            <BrandMark />
            <span>
              <span className="auth-brand-name">AtlasCredit</span>
              <span className="auth-brand-caption">CRM CRÉDIT &amp; OPÉRATIONS</span>
            </span>
          </div>

          <div className="auth-brand-copy">
            <h1>Gérez vos crédits et opérations en toute sécurité.</h1>
            <p>
              Une plateforme unique pour gérer les clients, les comptes, les
              transactions et les dossiers de crédit.
            </p>
            <ul className="auth-benefits">
              <li>
                <BenefitIcon type="shield" />
                Accès contrôlé selon votre rôle et votre agence
              </li>
              <li>
                <BenefitIcon type="journal" />
                Connexions et opérations journalisées
              </li>
              <li>
                <BenefitIcon type="access" />
                Session sécurisée par jeton d’accès
              </li>
            </ul>
          </div>

          <p className="auth-brand-legal">
            © 2026 AtlasCredit · Établissement financier agréé
          </p>
        </section>

        <section aria-labelledby="login-title" className="auth-form-panel">
          <div className="auth-form-content">
            <p className="auth-eyebrow">Espace collaborateur</p>
            <h2 id="login-title">Connexion</h2>
            <p className="auth-intro">
              Renseignez vos identifiants professionnels pour accéder à votre
              espace.
            </p>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="login-email">Identifiant professionnel</label>
                <div className="auth-input-wrap">
                  <FieldIcon type="email" />
                  <input
                    autoComplete="username"
                    id="login-email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nom@entreprise.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="login-password">Mot de passe</label>
                <div className="auth-input-wrap">
                  <FieldIcon type="password" />
                  <input
                    autoComplete="current-password"
                    id="login-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <svg aria-hidden="true" fill="none" height="19" viewBox="0 0 20 20" width="19">
                      <path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="auth-form-options">
                <label className="auth-remember">
                  <input
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    type="checkbox"
                  />
                  Se souvenir de moi
                </label>
                <p className="auth-recovery-note">
                  Mot de passe oublié ? Contactez votre administrateur.
                </p>
              </div>

              <button className="auth-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
                {!isSubmitting && (
                  <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 20 20" width="17">
                    <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                )}
              </button>
            </form>

            <div className="auth-security-note">
              <span aria-hidden="true" className="auth-security-icon">
                <svg fill="none" height="19" viewBox="0 0 20 20" width="19">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" />
                  <path d="M8.2 7.6a1.9 1.9 0 1 1 3.2 1.4c-.8.6-1.4 1-1.4 2.1M10 14h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              </span>
              <div>
                <strong>Connexion sécurisée</strong>
                <p>
                  Les tentatives de connexion sont limitées et journalisées.
                  Utilisez uniquement votre compte professionnel.
                </p>
              </div>
            </div>

            <p className="auth-support">
              <span>Besoin d’aide ?</span>
              Contactez votre administrateur informatique
            </p>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <span>◉&nbsp; Made with UX Pilot</span>
        <span>uxpilot.ai</span>
      </footer>
    </div>
  );
}

export default LoginView;
