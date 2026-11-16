import { useState } from 'react';
import useTransactionsViewModel from '../../viewmodels/useTransactionsViewModel';
import {
  TransactionDetailDialog,
  TransactionForm,
  WithdrawalDecisionDialog,
} from './TransactionDialogs';
import './TransactionsView.css';

const TYPE_LABELS = {
  depot: 'Dépôt',
  retrait: 'Retrait',
  virement: 'Virement',
  paiement_facture: 'Paiement de facture',
  deboursement: 'Déboursement de crédit',
  remboursement: 'Remboursement de crédit',
};

const STATUS_LABELS = {
  en_attente: 'En attente',
  terminee: 'Terminée',
  annulee: 'Rejetée / annulée',
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

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function TransactionStatus({ status }) {
  return <span className={`transaction-status transaction-status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function Pagination({ meta, page, isLoading, onPageChange, label }) {
  return (
    <footer className="users-pagination">
      <span>
        {meta.total === 0
          ? `Aucune ${label}`
          : `Affichage ${(meta.currentPage - 1) * meta.perPage + 1}–${Math.min(meta.currentPage * meta.perPage, meta.total)} sur ${countFormatter.format(meta.total)} ${label}`}
      </span>
      <div>
        <button aria-label="Page précédente" disabled={page <= 1 || isLoading} onClick={() => onPageChange((currentPage) => currentPage - 1)} type="button">‹</button>
        <span>Page {meta.currentPage} sur {meta.lastPage}</span>
        <button aria-label="Page suivante" disabled={page >= meta.lastPage || isLoading} onClick={() => onPageChange((currentPage) => currentPage + 1)} type="button">›</button>
      </div>
    </footer>
  );
}

function TransactionsView({ permissions, user }) {
  const canValidateWithdrawals = permissions.some(
    (permission) => permission.id === 'transactions.consulter_retraits_en_attente',
  );
  const canDeposit = permissions.some((permission) => permission.id === 'comptes.effectuer_depot');
  const canWithdraw = permissions.some((permission) => permission.id === 'comptes.effectuer_retrait');
  const canTransfer = permissions.some((permission) => permission.id === 'comptes.effectuer_virement_assiste');
  const viewModel = useTransactionsViewModel({ canValidateWithdrawals });
  const [activeTab, setActiveTab] = useState('history');
  const [operationType, setOperationType] = useState('');
  const [decision, setDecision] = useState(null);
  const [reference, setReference] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterError, setFilterError] = useState('');

  const submitFilters = (event) => {
    event.preventDefault();
    if (Boolean(startDate) !== Boolean(endDate)) {
      setFilterError('Renseignez les deux dates pour filtrer par période.');
      return;
    }
    setFilterError('');
    viewModel.applyFilters({
      reference: reference.trim(),
      accountNumber: accountNumber.trim(),
      type,
      status,
      startDate,
      endDate,
    });
  };

  const openOperation = (nextType) => {
    viewModel.clearActionError();
    viewModel.clearNotice();
    setOperationType(nextType);
  };

  const isViewingDetail = viewModel.selectedTransactionUuid !== '';

  return (
    <>
      <section aria-labelledby="transactions-title" className="transactions-page">
        <header className="users-page-heading">
          <div>
            <p className="users-breadcrumb">Accueil&nbsp; › &nbsp;Transactions</p>
            <h1 id="transactions-title">Transactions</h1>
            <p>Suivi des dépôts, retraits, virements et opérations de crédit.</p>
          </div>
          {(canDeposit || canWithdraw || canTransfer) && (
            <div className="transaction-actions">
              {canDeposit && <button className="users-button users-button-primary" onClick={() => openOperation('depot')} type="button">＋ Dépôt</button>}
              {canWithdraw && <button className="users-button users-button-secondary" onClick={() => openOperation('retrait')} type="button">Retrait</button>}
              {canTransfer && <button className="users-button users-button-secondary" onClick={() => openOperation('virement')} type="button">Virement</button>}
            </div>
          )}
        </header>

        {viewModel.notice && (
          <p className="users-notice users-notice-success" role="status">
            {viewModel.notice}
            <button aria-label="Fermer" onClick={viewModel.clearNotice} type="button">×</button>
          </p>
        )}

        {canValidateWithdrawals && (
          <div aria-label="Sections des transactions" className="transaction-tabs" role="tablist">
            <button
              aria-selected={activeTab === 'history'}
              className={activeTab === 'history' ? 'is-active' : ''}
              onClick={() => setActiveTab('history')}
              role="tab"
              type="button"
            >Historique</button>
            <button
              aria-selected={activeTab === 'pending'}
              className={activeTab === 'pending' ? 'is-active' : ''}
              onClick={() => setActiveTab('pending')}
              role="tab"
              type="button"
            >Retraits à valider <span>{viewModel.pendingMeta.total}</span></button>
          </div>
        )}

        {activeTab === 'pending' && canValidateWithdrawals ? (
          <section aria-labelledby="pending-withdrawals-title" className="users-card transaction-table-card" role="tabpanel">
            <header className="transaction-section-heading">
              <div>
                <p className="users-eyebrow">Retraits importants</p>
                <h2 id="pending-withdrawals-title">En attente de validation</h2>
              </div>
              <button className="users-button users-button-secondary" onClick={() => viewModel.retry('pending')} type="button">Actualiser</button>
            </header>
            {viewModel.pendingError && (
              <div className="users-notice users-notice-error" role="alert">
                <span>{viewModel.pendingError}</span>
                <button onClick={() => viewModel.retry('pending')} type="button">Réessayer</button>
              </div>
            )}
            <div className="users-table-scroll">
              <table className="users-table pending-withdrawals-table">
                <thead><tr><th>Date</th><th>Référence</th><th>Compte</th><th>Client</th><th>Montant</th><th>Demandé par</th><th>Actions</th></tr></thead>
                <tbody>
                  {viewModel.pendingWithdrawals.map((transaction) => {
                    const isOwnOperation = transaction.createdBy?.uuid === user.uuid;
                    return (
                      <tr key={transaction.uuid}>
                        <td>{formatDate(transaction.date)}</td>
                        <td><button className="transaction-reference-button" onClick={() => viewModel.showTransaction(transaction.uuid)} type="button">{transaction.reference}</button></td>
                        <td>{transaction.source?.number || '—'}</td>
                        <td>{transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName}` : '—'}</td>
                        <td><strong>{formatMoney(transaction.amount, transaction.currency)}</strong></td>
                        <td>{transaction.createdBy ? `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}` : '—'}</td>
                        <td>
                          {isOwnOperation ? (
                            <span className="transaction-self-validation">Votre opération</span>
                          ) : (
                            <div className="transaction-row-actions">
                              <button className="transaction-approve-button" onClick={() => { viewModel.clearActionError(); setDecision({ transaction, decision: 'approve' }); }} type="button">Approuver</button>
                              <button className="transaction-reject-button" onClick={() => { viewModel.clearActionError(); setDecision({ transaction, decision: 'reject' }); }} type="button">Rejeter</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {viewModel.isLoadingPending && <tr><td className="users-empty" colSpan="7">Chargement des retraits en attente…</td></tr>}
                  {!viewModel.isLoadingPending && viewModel.pendingWithdrawals.length === 0 && !viewModel.pendingError && (
                    <tr><td className="users-empty" colSpan="7">Aucun retrait n’attend de validation.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              isLoading={viewModel.isLoadingPending}
              label="retraits"
              meta={viewModel.pendingMeta}
              onPageChange={viewModel.setPendingPage}
              page={viewModel.pendingPage}
            />
          </section>
        ) : (
          <section aria-label="Historique des transactions" className="users-card transaction-table-card" role="tabpanel">
            <form className="users-filters transaction-filters" onSubmit={submitFilters}>
              <label className="users-search">
                <span aria-hidden="true" className="users-search-icon">⌕</span>
                <span className="users-visually-hidden">Rechercher une référence</span>
                <input onChange={(event) => setReference(event.target.value)} placeholder="Référence transaction…" type="search" value={reference} />
              </label>
              <label className="users-search">
                <span className="users-visually-hidden">Rechercher un compte</span>
                <input onChange={(event) => setAccountNumber(event.target.value)} placeholder="Numéro de compte…" type="search" value={accountNumber} />
              </label>
              <label className="users-filter-select">
                <span className="users-visually-hidden">Type de transaction</span>
                <select aria-label="Filtrer par type" onChange={(event) => setType(event.target.value)} value={type}>
                  <option value="">Tous les types</option>
                  <option value="depot">Dépôt</option>
                  <option value="retrait">Retrait</option>
                  <option value="virement">Virement</option>
                  <option value="paiement_facture">Paiement de facture</option>
                  <option value="deboursement">Déboursement de crédit</option>
                  <option value="remboursement">Remboursement</option>
                </select>
              </label>
              <label className="users-filter-select">
                <span className="users-visually-hidden">Statut de transaction</span>
                <select aria-label="Filtrer par statut" onChange={(event) => setStatus(event.target.value)} value={status}>
                  <option value="">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="terminee">Terminée</option>
                  <option value="annulee">Rejetée / annulée</option>
                </select>
              </label>
              <label className="transaction-date-filter"><span>Du</span><input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label>
              <label className="transaction-date-filter"><span>Au</span><input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></label>
              <button className="users-button users-button-secondary" type="submit">Filtrer</button>
            </form>
            {filterError && <p className="users-inline-error transaction-filter-error" role="alert">{filterError}</p>}
            {viewModel.error && (
              <div className="users-notice users-notice-error" role="alert">
                <span>{viewModel.error}</span>
                <button onClick={() => viewModel.retry('history')} type="button">Réessayer</button>
              </div>
            )}
            <div className="users-table-scroll">
              <table className="users-table transactions-table">
                <thead><tr><th>Date</th><th>Référence</th><th>Type</th><th>Compte(s)</th><th>Client</th><th>Montant</th><th>Statut</th><th>Action</th></tr></thead>
                <tbody>
                  {viewModel.transactions.map((transaction) => (
                    <tr key={transaction.uuid}>
                      <td>{formatDate(transaction.date)}</td>
                      <td><strong>{transaction.reference}</strong></td>
                      <td>{TYPE_LABELS[transaction.type] || transaction.type}</td>
                      <td>
                        <span>{transaction.source?.number || '—'}</span>
                        {transaction.recipient && <small className="transaction-recipient-account">Vers {transaction.recipient.number}</small>}
                      </td>
                      <td>{transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName}` : '—'}</td>
                      <td><strong>{formatMoney(transaction.amount, transaction.currency)}</strong></td>
                      <td><TransactionStatus status={transaction.status} /></td>
                      <td><button className="transaction-reference-button" onClick={() => viewModel.showTransaction(transaction.uuid)} type="button">Détail</button></td>
                    </tr>
                  ))}
                  {viewModel.isLoading && <tr><td className="users-empty" colSpan="8">Chargement des transactions…</td></tr>}
                  {!viewModel.isLoading && viewModel.transactions.length === 0 && !viewModel.error && (
                    <tr><td className="users-empty" colSpan="8">Aucune transaction ne correspond à ces critères.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              isLoading={viewModel.isLoading}
              label="transactions"
              meta={viewModel.transactionMeta}
              onPageChange={viewModel.setTransactionPage}
              page={viewModel.transactionPage}
            />
          </section>
        )}
      </section>

      {operationType && (
        <TransactionForm
          error={viewModel.actionError}
          isSaving={viewModel.isSavingOperation}
          onClose={() => setOperationType('')}
          onSubmit={viewModel.createOperation}
          type={operationType}
        />
      )}
      {decision && (
        <WithdrawalDecisionDialog
          decision={decision.decision}
          error={viewModel.actionError}
          isSaving={viewModel.isProcessingDecision}
          onClose={() => setDecision(null)}
          onSubmit={viewModel.decideWithdrawal}
          transaction={decision.transaction}
        />
      )}
      {isViewingDetail && (
        <TransactionDetailDialog
          error={viewModel.detailError}
          isLoading={viewModel.isLoadingDetail}
          onClose={viewModel.closeTransaction}
          onRetry={() => viewModel.retry()}
          transaction={viewModel.selectedTransaction}
        />
      )}
    </>
  );
}

export default TransactionsView;
