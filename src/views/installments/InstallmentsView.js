import { useEffect, useState } from 'react';
import ApiError from '../../core/api/ApiError';
import * as clientService from '../../services/clientService';
import useInstallmentsViewModel from '../../viewmodels/useInstallmentsViewModel';
import './InstallmentsView.css';

const INSTALLMENT_STATUSES = {
  a_payer: 'À payer',
  partiellement_paye: 'Partiellement payée',
  paye: 'Payée',
  en_retard: 'En retard',
  annule: 'Annulée',
};

const CREDIT_STATUSES = {
  en_etude: 'En étude',
  en_attente: 'En attente',
  approuve: 'Approuvé',
  rejete: 'Rejeté',
  debourse: 'Déboursé',
  en_remboursement: 'En remboursement',
  solde: 'Soldé',
  en_retard: 'En retard',
  annule: 'Annulé',
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

function InstallmentStatus({ status }) {
  return <span className={`installment-status installment-status-${status}`}>{INSTALLMENT_STATUSES[status] || status}</span>;
}

function Pagination({ meta, page, isLoading, onPageChange }) {
  return (
    <footer className="users-pagination">
      <span>
        {meta.total === 0
          ? 'Aucune échéance'
          : `Affichage ${(meta.currentPage - 1) * meta.perPage + 1}–${Math.min(meta.currentPage * meta.perPage, meta.total)} sur ${countFormatter.format(meta.total)} échéances`}
      </span>
      <div>
        <button aria-label="Page précédente" disabled={page <= 1 || isLoading} onClick={() => onPageChange((currentPage) => currentPage - 1)} type="button">‹</button>
        <span>Page {meta.currentPage} sur {meta.lastPage}</span>
        <button aria-label="Page suivante" disabled={page >= meta.lastPage || isLoading} onClick={() => onPageChange((currentPage) => currentPage + 1)} type="button">›</button>
      </div>
    </footer>
  );
}

function InstallmentDetail({ viewModel }) {
  const installment = viewModel.selectedInstallment;
  if (viewModel.isLoadingDetail) {
    return <p className="installment-loading" role="status">Chargement de l’échéance…</p>;
  }
  if (viewModel.detailError) {
    return (
      <div className="users-notice users-notice-error" role="alert">
        <span>{viewModel.detailError}</span>
        <button onClick={viewModel.retry} type="button">Réessayer</button>
        <button onClick={viewModel.backToList} type="button">Retour aux échéances</button>
      </div>
    );
  }
  if (!installment) return null;

  const credit = installment.credit;
  const account = credit?.account;
  const client = account?.client;

  return (
    <section aria-labelledby="installment-detail-title" className="installments-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">
            <button className="installment-text-button" onClick={viewModel.backToList} type="button">Échéances</button>
            {' › '}Échéance {installment.number}
          </p>
          <h1 id="installment-detail-title">Détail de l’échéance</h1>
          <p>{client ? `${client.firstName} ${client.lastName} · ${client.code}` : 'Client non renseigné'}</p>
        </div>
        <button className="users-button users-button-secondary" onClick={viewModel.backToList} type="button">Retour à la liste</button>
      </header>

      <article className="users-card installment-detail-card">
        <div className="installment-detail-heading">
          <div>
            <p className="users-eyebrow">Échéance n° {installment.number}</p>
            <h2>{account?.number || 'Compte associé indisponible'}</h2>
            <p>Crédit {credit?.uuid || 'indisponible'}</p>
          </div>
          <InstallmentStatus status={installment.status} />
        </div>
        <dl className="installment-detail-fields">
          <div><dt>Client</dt><dd>{client ? `${client.firstName} ${client.lastName}` : '—'}</dd></div>
          <div><dt>Code client</dt><dd>{client?.code || '—'}</dd></div>
          <div><dt>Statut du crédit</dt><dd>{CREDIT_STATUSES[credit?.status] || credit?.status || '—'}</dd></div>
          <div><dt>Date d’échéance</dt><dd>{formatDate(installment.dueAt)}</dd></div>
          <div><dt>Capital</dt><dd>{formatMoney(installment.principal)}</dd></div>
          <div><dt>Intérêts</dt><dd>{formatMoney(installment.interest)}</dd></div>
          <div><dt>Montant prévu</dt><dd>{formatMoney(installment.amount)}</dd></div>
          <div><dt>Montant payé</dt><dd>{formatMoney(installment.paid)}</dd></div>
          <div><dt>Reste à payer</dt><dd>{formatMoney(installment.remaining)}</dd></div>
          <div><dt>Date de paiement</dt><dd>{formatDate(installment.paidAt)}</dd></div>
        </dl>
        <p className="installment-detail-note">
          Les paiements se traitent depuis le dossier de crédit et sont répartis automatiquement sur les échéances ouvertes.
        </p>
      </article>
    </section>
  );
}

function InstallmentsView() {
  const viewModel = useInstallmentsViewModel();
  const [clients, setClients] = useState([]);
  const [clientUuid, setClientUuid] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [creditUuid, setCreditUuid] = useState('');
  const [status, setStatus] = useState('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientError, setClientError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const isViewingDetail = viewModel.selectedUuid !== '';

  useEffect(() => {
    let isCurrent = true;
    async function loadClients() {
      try {
        const result = await clientService.listClients({ page: 1, perPage: 100 });
        if (isCurrent) setClients(result.clients);
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) throw requestError;
        if (isCurrent) setClientError(requestError.message);
      }
    }
    void loadClients();
    return () => { isCurrent = false; };
  }, []);

  const searchClients = async () => {
    setIsSearchingClients(true);
    setClientError('');
    try {
      const result = await clientService.listClients({ search: clientSearch.trim(), page: 1, perPage: 100 });
      setClients(result.clients);
      if (!result.clients.some((client) => client.uuid === clientUuid)) setClientUuid('');
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setClientError(requestError.message);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const submitFilters = (event) => {
    event.preventDefault();
    if (Boolean(startDate) !== Boolean(endDate)) {
      setFilterError('Renseignez les deux dates pour filtrer la période.');
      return;
    }
    setFilterError('');
    viewModel.applyFilters({
      clientUuid,
      creditUuid: creditUuid.trim(),
      status,
      unpaidOnly,
      overdueOnly,
      startDate,
      endDate,
    });
  };

  if (isViewingDetail) return <InstallmentDetail viewModel={viewModel} />;

  return (
    <section aria-labelledby="installments-title" className="installments-page">
      <header className="users-page-heading">
        <div>
          <p className="users-breadcrumb">Accueil&nbsp; › &nbsp;Échéances</p>
          <h1 id="installments-title">Gestion des échéances</h1>
          <p>{countFormatter.format(viewModel.meta.total)} échéance(s) pour la sélection affichée.</p>
        </div>
        <button className="users-button users-button-secondary" onClick={viewModel.retry} type="button">Actualiser</button>
      </header>

      {viewModel.error && (
        <div className="users-notice users-notice-error" role="alert"><span>{viewModel.error}</span><button onClick={viewModel.retry} type="button">Réessayer</button></div>
      )}
      {clientError && <p className="users-inline-error installment-client-error" role="alert">Liste des clients indisponible : {clientError}</p>}

      <section aria-label="Filtres des échéances" className="users-card installment-list-card">
        <form className="users-filters installment-filters" onSubmit={submitFilters}>
          <label className="installment-client-search">
            <span>Rechercher un client</span>
            <span className="installment-search-row">
              <input
                onChange={(event) => setClientSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchClients();
                  }
                }}
                placeholder="Nom, code client, téléphone…"
                type="search"
                value={clientSearch}
              />
              <button className="users-button users-button-secondary" disabled={isSearchingClients} onClick={() => void searchClients()} type="button">
                {isSearchingClients ? 'Recherche…' : 'Rechercher'}
              </button>
            </span>
          </label>
          <label className="users-filter-select installment-client-select">
            <span className="users-visually-hidden">Filtrer par client</span>
            <select aria-label="Filtrer par client" onChange={(event) => setClientUuid(event.target.value)} value={clientUuid}>
              <option value="">Tous les clients</option>
              {clients.map((client) => <option key={client.uuid} value={client.uuid}>{client.firstName} {client.lastName} · {client.code}</option>)}
            </select>
          </label>
          <label className="installment-credit-filter">
            <span>UUID du crédit</span>
            <input onChange={(event) => setCreditUuid(event.target.value)} placeholder="UUID du dossier…" type="search" value={creditUuid} />
          </label>
          <label className="users-filter-select">
            <span className="users-visually-hidden">Filtrer par statut</span>
            <select aria-label="Filtrer par statut" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">Tous les statuts</option>
              <option value="a_payer">À payer</option>
              <option value="partiellement_paye">Partiellement payée</option>
              <option value="paye">Payée</option>
              <option value="en_retard">En retard</option>
              <option value="annule">Annulée</option>
            </select>
          </label>
          <label className="installment-date-filter"><span>Du</span><input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label>
          <label className="installment-date-filter"><span>Au</span><input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></label>
          <label className="installment-check-filter"><input checked={unpaidOnly} onChange={(event) => setUnpaidOnly(event.target.checked)} type="checkbox" /><span>Impayées uniquement</span></label>
          <label className="installment-check-filter"><input checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} type="checkbox" /><span>En retard uniquement</span></label>
          <button className="users-button users-button-primary" type="submit">Filtrer</button>
        </form>
        {filterError && <p className="users-inline-error installment-filter-error" role="alert">{filterError}</p>}
        <div className="users-table-scroll">
          <table className="users-table installments-table">
            <thead><tr><th>Échéance</th><th>Client</th><th>Compte</th><th>Crédit</th><th>Montant prévu</th><th>Payé</th><th>Reste à payer</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>
              {viewModel.installments.map((installment) => {
                const client = installment.credit?.account?.client;
                return (
                  <tr key={installment.uuid}>
                    <td><strong>N° {installment.number}</strong><small>{formatDate(installment.dueAt)}</small></td>
                    <td><span>{client ? `${client.firstName} ${client.lastName}` : '—'}</span><small>{client?.code || ''}</small></td>
                    <td>{installment.credit?.account?.number || '—'}</td>
                    <td><span className="installment-credit-uuid">{installment.credit?.uuid || '—'}</span></td>
                    <td>{formatMoney(installment.amount)}</td>
                    <td>{formatMoney(installment.paid)}</td>
                    <td><strong>{formatMoney(installment.remaining)}</strong></td>
                    <td><InstallmentStatus status={installment.status} /></td>
                    <td><button className="installment-row-action" onClick={() => viewModel.showInstallment(installment.uuid)} type="button">Détail</button></td>
                  </tr>
                );
              })}
              {viewModel.isLoading && <tr><td className="users-empty" colSpan="9">Chargement des échéances…</td></tr>}
              {!viewModel.isLoading && viewModel.installments.length === 0 && !viewModel.error && <tr><td className="users-empty" colSpan="9">Aucune échéance ne correspond à ces critères.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination isLoading={viewModel.isLoading} meta={viewModel.meta} onPageChange={viewModel.setPage} page={viewModel.page} />
      </section>
    </section>
  );
}

export default InstallmentsView;
