import { useState } from 'react';
import useAccountsViewModel from '../../viewmodels/useAccountsViewModel';
import AccountForm from './AccountForm';
import './AccountsView.css';

const ACCOUNT_TYPES = {
  courant: 'Courant',
  epargne: 'Épargne',
  credit: 'Crédit',
};

const ACCOUNT_STATUSES = {
  actif: 'Actif',
  bloque: 'Bloqué',
  cloture: 'Clôturé',
};

const countFormatter = new Intl.NumberFormat('fr-FR');
const moneyFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(amount, currency = 'XOF') {
  const value = Number(amount);
  return `${Number.isFinite(value) ? moneyFormatter.format(value) : amount} ${currency}`;
}

function formatDate(value, withTime = false) {
  if (!value) {
    return '—';
  }
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

function AccountStatus({ status }) {
  return (
    <span className={`account-status account-status-${status}`}>
      <span aria-hidden="true" />
      {ACCOUNT_STATUSES[status] || status}
    </span>
  );
}

function AccountDetail({ viewModel }) {
  const account = viewModel.selectedAccount;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);

  const getStatement = (event) => {
    event.preventDefault();
    void viewModel.loadStatement({ start: startDate, end: endDate });
  };

  if (viewModel.isLoadingDetail) {
    return <p className="account-loading" role="status">Chargement du compte…</p>;
  }
  if (viewModel.detailError) {
    return (
      <div className="users-notice users-notice-error" role="alert">
        <span>{viewModel.detailError}</span>
        <button onClick={viewModel.retry} type="button">Réessayer</button>
        <button onClick={viewModel.backToList} type="button">Retour aux comptes</button>
      </div>
    );
  }
  if (!account) {
    return null;
  }

  return (
    <section aria-labelledby="account-detail-title" className="accounts-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">
            <button className="account-text-button" onClick={viewModel.backToList} type="button">Comptes</button>
            {' › '}{account.number}
          </p>
          <h1 id="account-detail-title">Détail du compte</h1>
          <p>{account.client ? `${account.client.firstName} ${account.client.lastName}` : 'Client non renseigné'}</p>
        </div>
        <button className="users-button users-button-secondary" onClick={viewModel.backToList} type="button">
          Retour à la liste
        </button>
      </header>

      <article className="users-card account-summary">
        <div className="account-summary-heading">
          <div>
            <p className="users-eyebrow">{ACCOUNT_TYPES[account.type] || account.type}</p>
            <h2>{account.number}</h2>
            <p>{account.client?.code || 'Client'} · {account.client?.firstName} {account.client?.lastName}</p>
          </div>
          <AccountStatus status={account.status} />
        </div>
        <dl className="account-summary-fields">
          <div><dt>Solde disponible</dt><dd>{formatMoney(account.balance, account.currency)}</dd></div>
          <div><dt>Solde initial</dt><dd>{formatMoney(account.initialBalance || '0', account.currency)}</dd></div>
          <div><dt>Ouvert le</dt><dd>{formatDate(account.openedAt)}</dd></div>
          <div><dt>Agence</dt><dd>{account.agency?.name || '—'}</dd></div>
          {account.closedAt && <div><dt>Clôturé le</dt><dd>{formatDate(account.closedAt)}</dd></div>}
        </dl>
      </article>

      <section aria-labelledby="account-statement-title" className="users-card account-statement-card">
        <header className="account-section-heading">
          <div>
            <p className="users-eyebrow">Mouvements comptabilisés</p>
            <h2 id="account-statement-title">Relevé de compte</h2>
          </div>
        </header>
        <form className="users-filters account-statement-filters" onSubmit={getStatement}>
          <label className="account-date-field">
            <span>Du</span>
            <input onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
          </label>
          <label className="account-date-field">
            <span>Au</span>
            <input onChange={(event) => setEndDate(event.target.value)} required type="date" value={endDate} />
          </label>
          <button className="users-button users-button-primary" disabled={viewModel.isLoadingStatement} type="submit">
            {viewModel.isLoadingStatement ? 'Chargement…' : 'Afficher le relevé'}
          </button>
        </form>

        {viewModel.statementError && <p className="users-inline-error account-statement-error" role="alert">{viewModel.statementError}</p>}
        {viewModel.statement && (
          <>
            <div className="account-statement-totals">
              <div><span>Solde au début</span><strong>{formatMoney(viewModel.statement.period.openingBalance, account.currency)}</strong></div>
              <div><span>Total des crédits</span><strong className="account-credit-value">{formatMoney(viewModel.statement.totals.credits, account.currency)}</strong></div>
              <div><span>Total des débits</span><strong>{formatMoney(viewModel.statement.totals.debits, account.currency)}</strong></div>
              <div><span>Solde à la fin</span><strong>{formatMoney(viewModel.statement.totals.closingBalance, account.currency)}</strong></div>
            </div>
            <div className="users-table-scroll">
              <table className="users-table account-operations-table">
                <thead>
                  <tr><th>Date</th><th>Opération</th><th>Référence</th><th>Débit</th><th>Crédit</th><th>Solde après opération</th></tr>
                </thead>
                <tbody>
                  {viewModel.statement.operations.map((operation) => (
                    <tr key={`${operation.reference}-${operation.date}`}>
                      <td>{formatDate(operation.date, true)}</td>
                      <td><span>{operation.label}<small>{operation.type}</small></span></td>
                      <td>{operation.reference}</td>
                      <td>{operation.direction === 'debit' ? formatMoney(operation.amount, account.currency) : '—'}</td>
                      <td>{operation.direction === 'credit' ? formatMoney(operation.amount, account.currency) : '—'}</td>
                      <td>{formatMoney(operation.balanceAfter, account.currency)}</td>
                    </tr>
                  ))}
                  {viewModel.statement.operations.length === 0 && (
                    <tr><td className="users-empty" colSpan="6">Aucun mouvement sur cette période.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="users-pagination account-statement-pagination">
              <span>{countFormatter.format(viewModel.statement.meta.total)} opération(s) sur la période</span>
              <div>
                <button
                  aria-label="Page précédente du relevé"
                  disabled={viewModel.statement.meta.currentPage <= 1 || viewModel.isLoadingStatement}
                  onClick={() => void viewModel.loadStatement({ start: startDate, end: endDate, page: viewModel.statement.meta.currentPage - 1 })}
                  type="button"
                >‹</button>
                <span>Page {viewModel.statement.meta.currentPage} sur {viewModel.statement.meta.lastPage}</span>
                <button
                  aria-label="Page suivante du relevé"
                  disabled={viewModel.statement.meta.currentPage >= viewModel.statement.meta.lastPage || viewModel.isLoadingStatement}
                  onClick={() => void viewModel.loadStatement({ start: startDate, end: endDate, page: viewModel.statement.meta.currentPage + 1 })}
                  type="button"
                >›</button>
              </div>
            </footer>
          </>
        )}
      </section>
    </section>
  );
}

function AccountsView({ permissions }) {
  const viewModel = useAccountsViewModel();
  const [number, setNumber] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const canOpenAccount = permissions.some((permission) => permission.id === 'comptes.ouvrir');
  const isViewingDetail = viewModel.selectedAccountUuid !== '';

  const submitFilters = (event) => {
    event.preventDefault();
    viewModel.applyFilters({ number: number.trim(), type, status });
  };

  if (isViewingDetail) {
    return <AccountDetail viewModel={viewModel} />;
  }

  return (
    <>
      <section aria-labelledby="accounts-title" className="accounts-page">
        <header className="users-page-heading">
          <div>
            <p className="users-breadcrumb">Accueil&nbsp; › &nbsp;Comptes</p>
            <h1 id="accounts-title">Comptes</h1>
            <p>{countFormatter.format(viewModel.meta.total)} compte(s) · courant, épargne et crédit</p>
          </div>
          {canOpenAccount && (
            <button className="users-button users-button-primary" onClick={() => { viewModel.setActionError(''); setIsCreating(true); }} type="button">
              <span aria-hidden="true">＋</span> Ouvrir un compte
            </button>
          )}
        </header>

        {viewModel.error && (
          <div className="users-notice users-notice-error" role="alert">
            <span>{viewModel.error}</span>
            <button onClick={viewModel.retry} type="button">Réessayer</button>
          </div>
        )}
        {viewModel.notice && <p className="users-notice users-notice-success" role="status">{viewModel.notice}</p>}

        <section aria-label="Filtres des comptes" className="users-card">
          <form className="users-filters accounts-filters" onSubmit={submitFilters}>
            <label className="users-search">
              <span aria-hidden="true" className="users-search-icon">⌕</span>
              <span className="users-visually-hidden">Rechercher un numéro de compte</span>
              <input onChange={(event) => setNumber(event.target.value)} placeholder="Numéro de compte…" type="search" value={number} />
            </label>
            <label className="users-filter-select">
              <span className="users-visually-hidden">Filtrer par type</span>
              <select aria-label="Filtrer par type" onChange={(event) => setType(event.target.value)} value={type}>
                <option value="">Tous les types</option>
                <option value="courant">Courant</option>
                <option value="epargne">Épargne</option>
                <option value="credit">Crédit</option>
              </select>
            </label>
            <label className="users-filter-select">
              <span className="users-visually-hidden">Filtrer par statut</span>
              <select aria-label="Filtrer par statut" onChange={(event) => setStatus(event.target.value)} value={status}>
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="bloque">Bloqué</option>
                <option value="cloture">Clôturé</option>
              </select>
            </label>
            <button className="users-button users-button-secondary" type="submit">Filtrer</button>
          </form>

          <div className="users-table-scroll">
            <table className="users-table accounts-table">
              <thead>
                <tr><th>Compte</th><th>Client</th><th>Type</th><th>Solde</th><th>Agence</th><th>Statut</th><th>Ouverture</th><th>Action</th></tr>
              </thead>
              <tbody>
                {viewModel.accounts.map((account) => (
                  <tr key={account.uuid}>
                    <td><strong>{account.number}</strong></td>
                    <td>
                      <span>{account.client ? `${account.client.firstName} ${account.client.lastName}` : '—'}
                        {account.client && <small>{account.client.code}</small>}
                      </span>
                    </td>
                    <td>{ACCOUNT_TYPES[account.type] || account.type}</td>
                    <td><strong>{formatMoney(account.balance, account.currency)}</strong></td>
                    <td>{account.agency?.name || '—'}</td>
                    <td><AccountStatus status={account.status} /></td>
                    <td>{formatDate(account.openedAt)}</td>
                    <td>
                      <button className="account-row-action" onClick={() => viewModel.showAccount(account.uuid)} type="button">Détail</button>
                    </td>
                  </tr>
                ))}
                {viewModel.isLoading && <tr><td className="users-empty" colSpan="8">Chargement des comptes…</td></tr>}
                {!viewModel.isLoading && viewModel.accounts.length === 0 && (
                  <tr><td className="users-empty" colSpan="8">Aucun compte ne correspond à ces critères.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="users-pagination">
            <span>
              {viewModel.meta.total === 0
                ? 'Aucun compte'
                : `Affichage ${(viewModel.meta.currentPage - 1) * viewModel.meta.perPage + 1}–${Math.min(viewModel.meta.currentPage * viewModel.meta.perPage, viewModel.meta.total)} sur ${countFormatter.format(viewModel.meta.total)} comptes`}
            </span>
            <div>
              <button aria-label="Page précédente" disabled={viewModel.page <= 1 || viewModel.isLoading} onClick={() => viewModel.setPage((currentPage) => currentPage - 1)} type="button">‹</button>
              <span>Page {viewModel.meta.currentPage} sur {viewModel.meta.lastPage}</span>
              <button aria-label="Page suivante" disabled={viewModel.page >= viewModel.meta.lastPage || viewModel.isLoading} onClick={() => viewModel.setPage((currentPage) => currentPage + 1)} type="button">›</button>
            </div>
          </footer>
        </section>
      </section>

      {isCreating && (
        <AccountForm
          error={viewModel.actionError}
          isSaving={viewModel.isSaving}
          onClose={() => setIsCreating(false)}
          onSubmit={viewModel.createAccount}
        />
      )}
    </>
  );
}

export default AccountsView;
