import { useEffect, useState } from 'react';
import ApiError from '../../core/api/ApiError';
import * as accountService from '../../services/accountService';

const OPERATION_LABELS = {
  depot: 'Dépôt',
  retrait: 'Retrait',
  virement: 'Virement',
};

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

function createIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function TransactionForm({ type, error, isSaving, onClose, onSubmit }) {
  const [accounts, setAccounts] = useState([]);
  const [accountUuid, setAccountUuid] = useState('');
  const [recipientUuid, setRecipientUuid] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    async function loadAccounts() {
      try {
        const result = await accountService.listAccounts({ status: 'actif', page: 1, perPage: 100 });
        if (isCurrent) {
          setAccounts(result.accounts);
          setAccountUuid(result.accounts[0]?.uuid || '');
          setRecipientUuid(result.accounts.find((account) => account.uuid !== result.accounts[0]?.uuid)?.uuid || '');
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) throw requestError;
        if (isCurrent) setAccountError(requestError.message);
      } finally {
        if (isCurrent) setIsLoadingAccounts(false);
      }
    }
    void loadAccounts();
    return () => { isCurrent = false; };
  }, []);

  const searchAccounts = async () => {
    setIsSearchingAccounts(true);
    setAccountError('');
    try {
      const result = await accountService.listAccounts({
        number: accountSearch.trim(),
        status: 'actif',
        page: 1,
        perPage: 100,
      });
      setAccounts(result.accounts);
      setAccountUuid((currentUuid) => (
        result.accounts.some((account) => account.uuid === currentUuid)
          ? currentUuid
          : result.accounts[0]?.uuid || ''
      ));
      setRecipientUuid((currentUuid) => (
        currentUuid !== accountUuid && result.accounts.some((account) => account.uuid === currentUuid)
          ? currentUuid
          : result.accounts.find((account) => account.uuid !== accountUuid)?.uuid || ''
      ));
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setAccountError(requestError.message);
    } finally {
      setIsSearchingAccounts(false);
    }
  };

  const rotateKey = () => setIdempotencyKey(createIdempotencyKey());
  const submit = async (event) => {
    event.preventDefault();
    const succeeded = await onSubmit({
      type,
      accountUuid,
      recipientUuid,
      amount,
      reason: reason.trim(),
      idempotencyKey,
    });
    if (succeeded) onClose();
  };

  const activeAccounts = accounts.filter((account) => account.status === 'actif');
  const canSubmit = !isSaving
    && !isLoadingAccounts
    && Boolean(accountUuid)
    && (type !== 'virement' || (Boolean(recipientUuid) && recipientUuid !== accountUuid));

  return (
    <div className="users-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section aria-labelledby="transaction-form-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Opération de caisse</p>
            <h2 id="transaction-form-title">Nouveau {OPERATION_LABELS[type]?.toLowerCase()}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>
        <form className="users-form transaction-form" onSubmit={submit}>
          <label>
            Rechercher un numéro de compte
            <span className="transaction-account-search">
              <input
                onChange={(event) => setAccountSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchAccounts();
                  }
                }}
                placeholder="Numéro de compte…"
                type="search"
                value={accountSearch}
              />
              <button className="users-button users-button-secondary" disabled={isSearchingAccounts} onClick={() => void searchAccounts()} type="button">
                {isSearchingAccounts ? 'Recherche…' : 'Rechercher'}
              </button>
            </span>
          </label>
          <label>
            {type === 'virement' ? 'Compte source' : 'Compte'}
            <select
              disabled={isLoadingAccounts || isSaving || activeAccounts.length === 0}
              onChange={(event) => {
                const nextAccountUuid = event.target.value;
                setAccountUuid(nextAccountUuid);
                if (nextAccountUuid === recipientUuid) {
                  setRecipientUuid(activeAccounts.find((account) => account.uuid !== nextAccountUuid)?.uuid || '');
                }
                rotateKey();
              }}
              required
              value={accountUuid}
            >
              {activeAccounts.length === 0 && <option value="">Aucun compte actif trouvé</option>}
              {activeAccounts.map((account) => (
                <option key={account.uuid} value={account.uuid}>
                  {account.number} · {account.client ? `${account.client.firstName} ${account.client.lastName}` : 'Client'} · Solde {account.balance} {account.currency}
                </option>
              ))}
            </select>
          </label>
          {type === 'virement' && (
            <label>
              Compte destinataire
              <select
                disabled={isLoadingAccounts || isSaving || activeAccounts.length < 2}
                onChange={(event) => { setRecipientUuid(event.target.value); rotateKey(); }}
                required
                value={recipientUuid}
              >
                {activeAccounts.filter((account) => account.uuid !== accountUuid).map((account) => (
                  <option key={account.uuid} value={account.uuid}>
                    {account.number} · {account.client ? `${account.client.firstName} ${account.client.lastName}` : 'Client'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Montant (XOF)
            <input
              autoComplete="off"
              inputMode="decimal"
              max="9999999999999.99"
              min="0.01"
              onChange={(event) => { setAmount(event.target.value); rotateKey(); }}
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </label>
          <label>
            Motif <span className="transaction-form-optional">(facultatif)</span>
            <textarea
              maxLength="1000"
              onChange={(event) => { setReason(event.target.value); rotateKey(); }}
              rows="3"
              value={reason}
            />
          </label>
          {type === 'retrait' && (
            <p className="transaction-form-note">
              Un retrait supérieur à 2 000 000 XOF sera mis en attente de validation par un chef d’agence.
            </p>
          )}
          {(accountError || error) && <p className="users-inline-error" role="alert">{accountError || error}</p>}
          {isLoadingAccounts && <p className="transaction-form-note" role="status">Chargement des comptes actifs…</p>}
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button className="users-button users-button-primary" disabled={!canSubmit} type="submit">
              {isSaving ? 'Traitement…' : OPERATION_LABELS[type]}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function WithdrawalDecisionDialog({ transaction, decision, error, isSaving, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const isApproval = decision === 'approve';

  const submit = async (event) => {
    event.preventDefault();
    if (await onSubmit({ uuid: transaction.uuid, decision, reason: reason.trim() })) onClose();
  };

  return (
    <div className="users-modal-backdrop">
      <section aria-labelledby="withdrawal-decision-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Validation du retrait</p>
            <h2 id="withdrawal-decision-title">{isApproval ? 'Approuver ce retrait ?' : 'Rejeter ce retrait ?'}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>
        <form className="users-form transaction-form" onSubmit={submit}>
          <p className="transaction-decision-summary">
            <strong>{formatMoney(transaction.amount, transaction.currency)}</strong>
            <span>{transaction.source?.number || 'Compte source'} · {transaction.reference}</span>
          </p>
          {!isApproval && (
            <label>
              Motif du rejet <span className="transaction-form-optional">(facultatif)</span>
              <textarea maxLength="1000" onChange={(event) => setReason(event.target.value)} rows="3" value={reason} />
            </label>
          )}
          {error && <p className="users-inline-error" role="alert">{error}</p>}
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button className={`users-button ${isApproval ? 'users-button-primary' : 'users-button-danger'}`} disabled={isSaving} type="submit">
              {isSaving ? 'Traitement…' : isApproval ? 'Approuver le retrait' : 'Confirmer le rejet'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TransactionDetailDialog({ transaction, error, isLoading, onClose, onRetry }) {
  return (
    <div className="users-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="transaction-detail-title" aria-modal="true" className="users-modal transaction-detail-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Détail de l’opération</p>
            <h2 id="transaction-detail-title">{transaction?.reference || 'Transaction'}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" onClick={onClose} type="button">×</button>
        </header>
        {isLoading && <p className="transaction-detail-loading" role="status">Chargement de la transaction…</p>}
        {error && <div className="users-notice users-notice-error"><span>{error}</span><button onClick={onRetry} type="button">Réessayer</button></div>}
        {transaction && !isLoading && !error && (
          <dl className="transaction-detail-fields">
            <div><dt>Type</dt><dd>{TYPE_LABELS[transaction.type] || transaction.type}</dd></div>
            <div><dt>Montant</dt><dd>{formatMoney(transaction.amount, transaction.currency)}</dd></div>
            <div><dt>Statut</dt><dd>{STATUS_LABELS[transaction.status] || transaction.status}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(transaction.date)}</dd></div>
            <div><dt>Compte source</dt><dd>{transaction.source?.number || '—'}</dd></div>
            <div><dt>Compte destinataire</dt><dd>{transaction.recipient?.number || '—'}</dd></div>
            <div><dt>Client</dt><dd>{transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName} · ${transaction.client.code}` : '—'}</dd></div>
            <div><dt>Agence</dt><dd>{transaction.agency?.nom || '—'}</dd></div>
            <div><dt>Enregistrée par</dt><dd>{transaction.createdBy ? `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}` : '—'}</dd></div>
            <div><dt>Validée par</dt><dd>{transaction.validatedBy ? `${transaction.validatedBy.firstName} ${transaction.validatedBy.lastName}` : '—'}</dd></div>
            <div><dt>Date de validation</dt><dd>{formatDate(transaction.validatedAt)}</dd></div>
            <div className="transaction-detail-wide"><dt>Motif</dt><dd>{transaction.reason || 'Aucun motif renseigné'}</dd></div>
          </dl>
        )}
      </section>
    </div>
  );
}

export { TransactionDetailDialog, TransactionForm, WithdrawalDecisionDialog };
