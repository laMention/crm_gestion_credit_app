import { useEffect, useState } from 'react';
import ApiError from '../../core/api/ApiError';
import * as accountService from '../../services/accountService';

const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function formatMoney(amount, currency = 'XOF') {
  const value = Number(amount);
  return `${Number.isFinite(value) ? moneyFormatter.format(value) : amount} ${currency}`;
}

function createIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CreditForm({ credit, error, isSaving, onClose, onSubmit }) {
  const isEditing = Boolean(credit);
  const [accounts, setAccounts] = useState([]);
  const [accountUuid, setAccountUuid] = useState(credit?.account?.uuid || '');
  const [accountSearch, setAccountSearch] = useState('');
  const [amount, setAmount] = useState(credit?.requestedAmount || '');
  const [rate, setRate] = useState(credit?.annualRate || '');
  const [duration, setDuration] = useState(credit?.durationMonths || '');
  const [observations, setObservations] = useState(credit?.observations || '');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(!isEditing);
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    if (isEditing) return undefined;
    let isCurrent = true;
    async function loadAccounts() {
      try {
        const result = await accountService.listAccounts({ status: 'actif', page: 1, perPage: 100 });
        if (isCurrent) {
          setAccounts(result.accounts);
          setAccountUuid(result.accounts[0]?.uuid || '');
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
  }, [isEditing]);

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
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setAccountError(requestError.message);
    } finally {
      setIsSearchingAccounts(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const succeeded = await onSubmit({
      uuid: credit?.uuid,
      accountUuid,
      payload: {
        montant_demande: amount,
        taux_interet_annuel: rate,
        duree_mois: Number(duration),
        observations: observations.trim() || null,
      },
    });
    if (succeeded) onClose();
  };

  const activeAccounts = accounts.filter((account) => account.status === 'actif');
  return (
    <div className="users-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onClose();
    }}>
      <section aria-labelledby="credit-form-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Instruction du dossier</p>
            <h2 id="credit-form-title">{isEditing ? 'Modifier la demande' : 'Nouvelle demande de crédit'}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>
        <form className="users-form credit-form" onSubmit={submit}>
          {!isEditing && (
            <>
              <label>
                Rechercher un numéro de compte
                <span className="credit-account-search">
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
                Compte actif du client
                <select disabled={isLoadingAccounts || activeAccounts.length === 0 || isSaving} onChange={(event) => setAccountUuid(event.target.value)} required value={accountUuid}>
                  {activeAccounts.length === 0 && <option value="">Aucun compte actif trouvé</option>}
                  {activeAccounts.map((account) => (
                    <option key={account.uuid} value={account.uuid}>
                      {account.number} · {account.client ? `${account.client.firstName} ${account.client.lastName}` : 'Client'} · {account.type}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="credit-form-grid">
            <label>
              Montant demandé (XOF)
              <input autoComplete="off" inputMode="decimal" max="9999999999999.99" min="0.01" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
            </label>
            <label>
              Taux annuel (%)
              <input inputMode="decimal" max="9999.9999" min="0" onChange={(event) => setRate(event.target.value)} required step="0.0001" type="number" value={rate} />
            </label>
            <label>
              Durée (mois)
              <input max="600" min="1" onChange={(event) => setDuration(event.target.value)} required step="1" type="number" value={duration} />
            </label>
            <label className="credit-form-wide">
              Observations <span className="credit-form-optional">(facultatif)</span>
              <textarea maxLength="5000" onChange={(event) => setObservations(event.target.value)} rows="3" value={observations} />
            </label>
          </div>
          <p className="credit-form-note">
            Après enregistrement, transmettez le dossier au chef d’agence pour décision. L’approbation déclenche le décaissement et la création de l’échéancier.
          </p>
          {(accountError || error) && <p className="users-inline-error" role="alert">{accountError || error}</p>}
          {isLoadingAccounts && <p className="credit-form-note" role="status">Chargement des comptes actifs…</p>}
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button className="users-button users-button-primary" disabled={isSaving || (!isEditing && (isLoadingAccounts || !accountUuid))} type="submit">
              {isSaving ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Créer la demande'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CreditDecisionDialog({ credit, decision, error, isSaving, onClose, onSubmit }) {
  const isApproval = decision === 'approve';
  const [approvedAmount, setApprovedAmount] = useState(credit.requestedAmount);
  const [reason, setReason] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const succeeded = await onSubmit({
      uuid: credit.uuid,
      decision,
      approvedAmount: approvedAmount.trim(),
      reason: reason.trim(),
    });
    if (succeeded) onClose();
  };

  return (
    <div className="users-modal-backdrop">
      <section aria-labelledby="credit-decision-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Décision du chef d’agence</p>
            <h2 id="credit-decision-title">{isApproval ? 'Approuver et décaisser ?' : 'Rejeter la demande ?'}</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>
        <form className="users-form credit-form" onSubmit={submit}>
          <p className="credit-decision-summary">
            <strong>{credit.account?.client ? `${credit.account.client.firstName} ${credit.account.client.lastName}` : 'Client'}</strong>
            <span>{credit.account?.number || 'Compte'} · demande de {formatMoney(credit.requestedAmount)}</span>
          </p>
          {isApproval ? (
            <label>
              Montant accordé (XOF)
              <input autoComplete="off" inputMode="decimal" max={credit.requestedAmount} min="0.01" onChange={(event) => setApprovedAmount(event.target.value)} required step="0.01" type="number" value={approvedAmount} />
              <small>Le montant ne peut pas dépasser la somme demandée. L’approbation verse immédiatement le montant sur le compte et génère l’échéancier.</small>
            </label>
          ) : (
            <label>
              Motif du rejet
              <textarea minLength="3" maxLength="1000" onChange={(event) => setReason(event.target.value)} required rows="3" value={reason} />
            </label>
          )}
          {error && <p className="users-inline-error" role="alert">{error}</p>}
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button className={`users-button ${isApproval ? 'users-button-primary' : 'users-button-danger'}`} disabled={isSaving} type="submit">
              {isSaving ? 'Traitement…' : isApproval ? 'Approuver et décaisser' : 'Rejeter la demande'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toCents(value) {
  const [units, decimals = ''] = String(value || '0').split('.');
  return (Number(units) * 100) + Number(decimals.padEnd(2, '0').slice(0, 2));
}

function RepaymentDialog({ credit, installments, error, isSaving, onClose, onSubmit }) {
  const [accounts, setAccounts] = useState([]);
  const [accountUuid, setAccountUuid] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accountError, setAccountError] = useState('');
  const remainingDueCents = installments.reduce((total, installment) => total + toCents(installment.remaining), 0);
  const remainingDue = (remainingDueCents / 100).toFixed(2);
  const selectedAccount = accounts.find((account) => account.uuid === accountUuid);

  useEffect(() => {
    let isCurrent = true;
    async function loadAccounts() {
      try {
        const result = await accountService.listAccounts({
          clientUuid: credit.account?.client?.uuid,
          status: 'actif',
          page: 1,
          perPage: 100,
        });
        if (isCurrent) {
          setAccounts(result.accounts);
          setAccountUuid(result.accounts[0]?.uuid || '');
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
  }, [credit.account?.client?.uuid]);

  const rotateKey = () => setIdempotencyKey(createIdempotencyKey());
  const submit = async (event) => {
    event.preventDefault();
    if (await onSubmit(credit.uuid, {
      accountUuid,
      amount,
      reason: reason.trim(),
      idempotencyKey,
    })) onClose();
  };

  return (
    <div className="users-modal-backdrop">
      <section aria-labelledby="repayment-title" aria-modal="true" className="users-modal" role="dialog">
        <header className="users-modal-header">
          <div>
            <p className="users-eyebrow">Remboursement du crédit</p>
            <h2 id="repayment-title">Enregistrer un paiement</h2>
          </div>
          <button aria-label="Fermer" className="users-icon-button" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>
        <form className="users-form credit-form" onSubmit={submit}>
          <p className="credit-decision-summary">
            <strong>Restant dû : {formatMoney(remainingDue, credit.account?.currency)}</strong>
            <span>Le paiement sera réparti automatiquement sur les échéances les plus anciennes.</span>
          </p>
          <label>
            Compte de paiement du client
            <select disabled={isLoadingAccounts || accounts.length === 0 || isSaving} onChange={(event) => { setAccountUuid(event.target.value); rotateKey(); }} required value={accountUuid}>
              {accounts.length === 0 && <option value="">Aucun compte actif pour ce client</option>}
              {accounts.map((account) => (
                <option key={account.uuid} value={account.uuid}>
                  {account.number} · Solde {formatMoney(account.balance, account.currency)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Montant du remboursement (XOF)
            <input autoComplete="off" inputMode="decimal" max={Math.min(Number(remainingDue), Number(selectedAccount?.balance || 0))} min="0.01" onChange={(event) => { setAmount(event.target.value); rotateKey(); }} required step="0.01" type="number" value={amount} />
            <small>Le montant ne peut dépasser ni le restant dû ni le solde du compte de paiement.</small>
          </label>
          <label>
            Motif <span className="credit-form-optional">(facultatif)</span>
            <textarea maxLength="1000" onChange={(event) => { setReason(event.target.value); rotateKey(); }} rows="3" value={reason} />
          </label>
          {(accountError || error) && <p className="users-inline-error" role="alert">{accountError || error}</p>}
          {isLoadingAccounts && <p className="credit-form-note" role="status">Chargement des comptes du client…</p>}
          <div className="users-modal-actions">
            <button className="users-button users-button-secondary" disabled={isSaving} onClick={onClose} type="button">Annuler</button>
            <button className="users-button users-button-primary" disabled={isSaving || isLoadingAccounts || !accountUuid || remainingDueCents <= 0} type="submit">
              {isSaving ? 'Enregistrement…' : 'Enregistrer le remboursement'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export { CreditDecisionDialog, CreditForm, RepaymentDialog };
