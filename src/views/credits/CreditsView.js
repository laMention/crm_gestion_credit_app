import { useState } from 'react';
import useCreditsViewModel from '../../viewmodels/useCreditsViewModel';
import { CreditDecisionDialog, CreditForm, RepaymentDialog } from './CreditDialogs';
import './CreditsView.css';

const CREDIT_STATUSES = {
  en_etude: 'En étude',
  en_attente: 'En attente de décision',
  approuve: 'Approuvé',
  rejete: 'Rejeté',
  debourse: 'Déboursé',
  en_remboursement: 'En remboursement',
  solde: 'Soldé',
  en_retard: 'En retard',
  annule: 'Annulé',
};

const INSTALLMENT_STATUSES = {
  a_payer: 'À payer',
  partiellement_paye: 'Partiellement payée',
  paye: 'Payée',
  en_retard: 'En retard',
  annule: 'Annulée',
};

const countFormatter = new Intl.NumberFormat('fr-FR');
const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function formatMoney(amount, currency = 'XOF') {
  const value = Number(amount);
  return `${Number.isFinite(value) ? moneyFormatter.format(value) : amount} ${currency}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

function CreditStatus({ status }) {
  return <span className={`credit-status credit-status-${status}`}>{CREDIT_STATUSES[status] || status}</span>;
}

function CreditTracking({ tracking, error }) {
  const metrics = [
    ['En instruction', tracking.inStudy],
    ['À valider', tracking.awaitingApproval],
    ['Déboursés', tracking.disbursed],
    ['En retard', tracking.overdue],
    ['Capital restant dû', formatMoney(tracking.remainingPrincipal)],
    ['Échéances impayées', formatMoney(tracking.unpaidInstallments)],
  ];
  return (
    <>
      {error && <p className="credit-tracking-error" role="alert">Indicateurs indisponibles : {error}</p>}
      <section aria-label="Indicateurs de crédits" className="credit-tracking-grid">
        {metrics.map(([label, value]) => (
          <article className="credit-tracking-card" key={label}>
            <span>{label}</span>
            <strong>{typeof value === 'number' ? countFormatter.format(value) : value}</strong>
          </article>
        ))}
      </section>
    </>
  );
}

function CreditDetail({ viewModel, permissions, user, onEdit, onDecide, onRepay }) {
  const credit = viewModel.selectedCredit;
  const canEditOwnDraft = permissions.some((permission) => permission.id === 'credits.modifier_demande')
    && credit?.status === 'en_etude'
    && credit.advisor?.uuid === user.uuid;
  const canSubmitOwnDraft = permissions.some((permission) => permission.id === 'credits.soumettre_demande')
    && credit?.status === 'en_etude'
    && credit.advisor?.uuid === user.uuid;
  const canApprove = permissions.some((permission) => permission.id === 'credits.approuver');
  const canReject = permissions.some((permission) => permission.id === 'credits.rejeter');
  const isPending = credit?.status === 'en_attente';
  const canDecideThisCredit = isPending && credit.advisor?.uuid !== user.uuid;
  const canRepay = permissions.some((permission) => permission.id === 'credits.enregistrer_remboursement')
    && ['debourse', 'en_remboursement', 'en_retard'].includes(credit?.status)
    && viewModel.installments.some((installment) => Number(installment.remaining) > 0);

  if (viewModel.isLoadingDetail) {
    return <p className="credit-loading" role="status">Chargement du dossier de crédit…</p>;
  }
  if (viewModel.detailError) {
    return (
      <div className="users-notice users-notice-error" role="alert">
        <span>{viewModel.detailError}</span>
        <button onClick={viewModel.retry} type="button">Réessayer</button>
        <button onClick={viewModel.backToList} type="button">Retour aux crédits</button>
      </div>
    );
  }
  if (!credit) return null;

  return (
    <section aria-labelledby="credit-detail-title" className="credits-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">
            <button className="credit-text-button" onClick={viewModel.backToList} type="button">Crédits</button>
            {' › '}{credit.account?.number || 'Dossier'}
          </p>
          <h1 id="credit-detail-title">Dossier de crédit</h1>
          <p>{credit.account?.client ? `${credit.account.client.firstName} ${credit.account.client.lastName}` : 'Client non renseigné'}</p>
        </div>
        <div className="credit-detail-heading-actions">
          <button className="users-button users-button-secondary" onClick={viewModel.backToList} type="button">Retour à la liste</button>
          {canEditOwnDraft && <button className="users-button users-button-primary" onClick={onEdit} type="button">Modifier la demande</button>}
        </div>
      </header>

      {viewModel.notice && <p className="users-notice users-notice-success" role="status">{viewModel.notice}<button aria-label="Fermer" onClick={viewModel.clearNotice} type="button">×</button></p>}

      <article className="users-card credit-detail-card">
        <div className="credit-detail-identity">
          <div>
            <p className="users-eyebrow">{credit.account?.client?.code || 'Dossier client'}</p>
            <h2>{credit.account?.client ? `${credit.account.client.firstName} ${credit.account.client.lastName}` : 'Crédit'}</h2>
            <span className="credit-account-reference">{credit.account?.number || 'Compte non renseigné'}</span>
          </div>
          <CreditStatus status={credit.status} />
        </div>
        {credit.status === 'rejete' && credit.rejectionReason && (
          <p className="credit-rejection-reason"><strong>Motif du rejet :</strong> {credit.rejectionReason}</p>
        )}
        <dl className="credit-detail-fields">
          <div><dt>Montant demandé</dt><dd>{formatMoney(credit.requestedAmount)}</dd></div>
          <div><dt>Montant accordé</dt><dd>{credit.approvedAmount ? formatMoney(credit.approvedAmount) : '—'}</dd></div>
          <div><dt>Taux annuel</dt><dd>{credit.annualRate} %</dd></div>
          <div><dt>Durée</dt><dd>{credit.durationMonths} mois</dd></div>
          <div><dt>Mensualité prévue</dt><dd>{credit.monthlyPayment ? formatMoney(credit.monthlyPayment) : '—'}</dd></div>
          <div><dt>Capital restant dû</dt><dd>{credit.remainingPrincipal ? formatMoney(credit.remainingPrincipal) : '—'}</dd></div>
          <div><dt>Total des intérêts</dt><dd>{credit.totalInterest ? formatMoney(credit.totalInterest) : '—'}</dd></div>
          <div><dt>Date de demande</dt><dd>{formatDate(credit.requestedAt)}</dd></div>
          <div><dt>Date d’approbation</dt><dd>{formatDate(credit.approvedAt)}</dd></div>
          <div><dt>Date de décaissement</dt><dd>{formatDate(credit.disbursedAt)}</dd></div>
          <div><dt>Début des remboursements</dt><dd>{formatDate(credit.repaymentStartAt)}</dd></div>
          <div><dt>Fin prévue</dt><dd>{formatDate(credit.expectedEndAt)}</dd></div>
          <div><dt>Conseiller</dt><dd>{credit.advisor ? `${credit.advisor.firstName} ${credit.advisor.lastName}` : '—'}</dd></div>
          <div><dt>Validateur</dt><dd>{credit.validator ? `${credit.validator.firstName} ${credit.validator.lastName}` : '—'}</dd></div>
          {credit.observations && <div className="credit-detail-wide"><dt>Observations</dt><dd>{credit.observations}</dd></div>}
        </dl>
        {(canEditOwnDraft || canSubmitOwnDraft || (canDecideThisCredit && (canApprove || canReject)) || canRepay) && (
          <div className="credit-detail-actions">
            {canSubmitOwnDraft && (
              <button className="users-button users-button-primary" disabled={viewModel.isProcessingAction} onClick={() => { viewModel.clearActionError(); void viewModel.submitCredit(credit.uuid); }} type="button">
                Soumettre pour approbation
              </button>
            )}
            {canDecideThisCredit && canApprove && (
              <button className="users-button users-button-primary" onClick={() => onDecide('approve')} type="button">Approuver et décaisser</button>
            )}
            {canDecideThisCredit && canReject && (
              <button className="users-button users-button-danger" onClick={() => onDecide('reject')} type="button">Rejeter la demande</button>
            )}
            {canRepay && <button className="users-button users-button-primary" onClick={onRepay} type="button">Enregistrer un remboursement</button>}
          </div>
        )}
        {viewModel.actionError && <p className="users-inline-error credit-action-error" role="alert">{viewModel.actionError}</p>}
      </article>

      <section aria-labelledby="credit-installments-title" className="users-card credit-installments-card">
        <header className="credit-section-heading">
          <div>
            <p className="users-eyebrow">{countFormatter.format(viewModel.installmentTotal)} échéance(s)</p>
            <h2 id="credit-installments-title">Échéancier de remboursement</h2>
          </div>
        </header>
        <div className="users-table-scroll">
          <table className="users-table credit-installments-table">
            <thead><tr><th>N°</th><th>Date prévue</th><th>Capital</th><th>Intérêts</th><th>Montant prévu</th><th>Payé</th><th>Reste à payer</th><th>Statut</th></tr></thead>
            <tbody>
              {viewModel.installments.map((installment) => (
                <tr key={installment.uuid}>
                  <td>{installment.number}</td>
                  <td>{formatDate(installment.dueAt)}</td>
                  <td>{formatMoney(installment.principal)}</td>
                  <td>{formatMoney(installment.interest)}</td>
                  <td>{formatMoney(installment.amount)}</td>
                  <td>{formatMoney(installment.paid)}</td>
                  <td><strong>{formatMoney(installment.remaining)}</strong></td>
                  <td><span className={`credit-installment-status credit-installment-status-${installment.status}`}>{INSTALLMENT_STATUSES[installment.status] || installment.status}</span></td>
                </tr>
              ))}
              {viewModel.installments.length === 0 && (
                <tr><td className="users-empty" colSpan="8">Aucun échéancier disponible pour ce dossier.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function CreditsView({ permissions, user }) {
  const viewModel = useCreditsViewModel();
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterError, setFilterError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formCredit, setFormCredit] = useState(null);
  const [decision, setDecision] = useState('');
  const [isRepaying, setIsRepaying] = useState(false);

  const canPrepare = permissions.some((permission) => permission.id === 'credits.preparer_demande');
  const canViewDetail = permissions.some((permission) => permission.id === 'credits.consulter');
  const isViewingDetail = viewModel.selectedCreditUuid !== '';

  const submitFilters = (event) => {
    event.preventDefault();
    if (Boolean(startDate) !== Boolean(endDate)) {
      setFilterError('Renseignez les deux dates pour filtrer la période.');
      return;
    }
    setFilterError('');
    viewModel.applyFilters({ status, startDate, endDate });
  };

  const openCreateForm = () => {
    viewModel.clearActionError();
    setFormCredit(null);
    setIsCreating(true);
  };

  const closeForm = () => {
    setFormCredit(null);
    setIsCreating(false);
  };

  const openDecision = (nextDecision) => {
    viewModel.clearActionError();
    setDecision(nextDecision);
  };

  if (isViewingDetail) {
    return (
      <>
        <CreditDetail
          onDecide={openDecision}
          onEdit={() => { setFormCredit(viewModel.selectedCredit); setIsCreating(false); viewModel.clearActionError(); }}
          onRepay={() => { viewModel.clearActionError(); setIsRepaying(true); }}
          permissions={permissions}
          user={user}
          viewModel={viewModel}
        />
        {formCredit && <CreditForm credit={formCredit} error={viewModel.actionError} isSaving={viewModel.isSaving} onClose={closeForm} onSubmit={viewModel.saveCredit} />}
        {decision && viewModel.selectedCredit && (
          <CreditDecisionDialog credit={viewModel.selectedCredit} decision={decision} error={viewModel.actionError} isSaving={viewModel.isProcessingAction} onClose={() => setDecision('')} onSubmit={viewModel.decideCredit} />
        )}
        {isRepaying && viewModel.selectedCredit && (
          <RepaymentDialog credit={viewModel.selectedCredit} error={viewModel.actionError} installments={viewModel.installments} isSaving={viewModel.isProcessingAction} onClose={() => setIsRepaying(false)} onSubmit={viewModel.makeRepayment} />
        )}
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="credits-title" className="credits-page">
        <header className="users-page-heading">
          <div>
            <p className="users-breadcrumb">Accueil&nbsp; › &nbsp;Crédits</p>
            <h1 id="credits-title">Gestion des crédits</h1>
            <p>Instruction des demandes, décisions, décaissements et remboursements.</p>
          </div>
          {canPrepare && <button className="users-button users-button-primary" onClick={openCreateForm} type="button"><span aria-hidden="true">＋</span> Nouvelle demande</button>}
        </header>

        {viewModel.notice && <p className="users-notice users-notice-success" role="status">{viewModel.notice}<button aria-label="Fermer" onClick={viewModel.clearNotice} type="button">×</button></p>}
        {viewModel.error && (
          <div className="users-notice users-notice-error" role="alert"><span>{viewModel.error}</span><button onClick={viewModel.retry} type="button">Réessayer</button></div>
        )}
        <CreditTracking error={viewModel.trackingError} tracking={viewModel.tracking} />

        <section aria-label="Filtres des crédits" className="users-card credit-list-card">
          <form className="users-filters credit-filters" onSubmit={submitFilters}>
            <label className="users-filter-select">
              <span className="users-visually-hidden">Filtrer par statut du crédit</span>
              <select aria-label="Filtrer par statut" onChange={(event) => setStatus(event.target.value)} value={status}>
                <option value="">Tous les statuts</option>
                <option value="en_etude">En étude</option>
                <option value="en_attente">En attente de décision</option>
                <option value="approuve">Approuvé</option>
                <option value="debourse">Déboursé</option>
                <option value="en_remboursement">En remboursement</option>
                <option value="en_retard">En retard</option>
                <option value="solde">Soldé</option>
                <option value="rejete">Rejeté</option>
                <option value="annule">Annulé</option>
              </select>
            </label>
            <label className="credit-date-filter"><span>Demande du</span><input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label>
            <label className="credit-date-filter"><span>Au</span><input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></label>
            <button className="users-button users-button-secondary" type="submit">Filtrer</button>
          </form>
          {filterError && <p className="users-inline-error credit-filter-error" role="alert">{filterError}</p>}
          <div className="users-table-scroll">
            <table className="users-table credits-table">
              <thead><tr><th>Client / compte</th><th>Demandé</th><th>Accordé</th><th>Durée</th><th>Mensualité</th><th>Demande</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>
                {viewModel.credits.map((credit) => (
                  <tr key={credit.uuid}>
                    <td>
                      <span>{credit.account?.client ? `${credit.account.client.firstName} ${credit.account.client.lastName}` : 'Client'}</span>
                      <small>{credit.account?.number || 'Compte indisponible'}</small>
                    </td>
                    <td><strong>{formatMoney(credit.requestedAmount)}</strong></td>
                    <td>{credit.approvedAmount ? formatMoney(credit.approvedAmount) : '—'}</td>
                    <td>{credit.durationMonths} mois</td>
                    <td>{credit.monthlyPayment ? formatMoney(credit.monthlyPayment) : '—'}</td>
                    <td>{formatDate(credit.requestedAt)}</td>
                    <td><CreditStatus status={credit.status} /></td>
                    <td><button className="credit-row-action" disabled={!canViewDetail} onClick={() => viewModel.showCredit(credit.uuid)} type="button">Détail</button></td>
                  </tr>
                ))}
                {viewModel.isLoading && <tr><td className="users-empty" colSpan="8">Chargement des crédits…</td></tr>}
                {!viewModel.isLoading && viewModel.credits.length === 0 && !viewModel.error && <tr><td className="users-empty" colSpan="8">Aucun crédit ne correspond à ces critères.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="users-pagination">
            <span>{viewModel.meta.total === 0 ? 'Aucun crédit' : `Affichage ${(viewModel.meta.currentPage - 1) * viewModel.meta.perPage + 1}–${Math.min(viewModel.meta.currentPage * viewModel.meta.perPage, viewModel.meta.total)} sur ${countFormatter.format(viewModel.meta.total)} crédits`}</span>
            <div>
              <button aria-label="Page précédente" disabled={viewModel.page <= 1 || viewModel.isLoading} onClick={() => viewModel.setPage((currentPage) => currentPage - 1)} type="button">‹</button>
              <span>Page {viewModel.meta.currentPage} sur {viewModel.meta.lastPage}</span>
              <button aria-label="Page suivante" disabled={viewModel.page >= viewModel.meta.lastPage || viewModel.isLoading} onClick={() => viewModel.setPage((currentPage) => currentPage + 1)} type="button">›</button>
            </div>
          </footer>
        </section>
      </section>
      {isCreating && <CreditForm error={viewModel.actionError} isSaving={viewModel.isSaving} onClose={closeForm} onSubmit={viewModel.saveCredit} />}
    </>
  );
}

export default CreditsView;
