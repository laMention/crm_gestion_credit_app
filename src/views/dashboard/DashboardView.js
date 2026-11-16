import useDashboardViewModel from '../../viewmodels/useDashboardViewModel';
import './DashboardView.css';

const TRANSACTION_LABELS = {
  depot: 'Dépôts',
  retrait: 'Retraits',
  virement: 'Virements',
  paiement_facture: 'Paiements de facture',
  deboursement: 'Décaissements',
  remboursement: 'Remboursements',
};

const STATUS_LABELS = {
  en_attente: 'En attente',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const countFormatter = new Intl.NumberFormat('fr-FR');
const amountFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(amount, currency = 'XOF') {
  return `${amountFormatter.format(Number(amount))} ${currency}`;
}

function formatPeriodDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function metricCard({ title, value, detail, icon, variant = '' }) {
  return (
    <article className={`dashboard-metric${variant ? ` ${variant}` : ''}`}>
      <div className="dashboard-metric-heading">
        <h2>{title}</h2>
        <span aria-hidden="true" className="dashboard-metric-icon">{icon}</span>
      </div>
      <strong className="dashboard-metric-value">{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function DashboardView({ canViewTransactions }) {
  const viewModel = useDashboardViewModel(canViewTransactions);
  const indicators = viewModel.indicators;

  const handlePeriodSubmit = (event) => {
    event.preventDefault();
    viewModel.applyPeriod();
  };

  return (
    <section aria-labelledby="dashboard-title" className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <p className="users-eyebrow">Activité</p>
          <h1 id="dashboard-title">Tableau de bord</h1>
          {indicators && (
            <p className="dashboard-period-caption">
              {indicators.perimeter === 'reseau'
                ? 'Vue réseau'
                : 'Vue agence'}
              {' · '}
              {formatPeriodDate(indicators.period.start)}
              {' – '}
              {formatPeriodDate(indicators.period.end)}
            </p>
          )}
        </div>
        <form className="dashboard-period-form" onSubmit={handlePeriodSubmit}>
          <label>
            <span>Du</span>
            <input
              aria-label="Date de début"
              onChange={(event) => viewModel.updateDraftPeriod(
                'dateStart',
                event.target.value,
              )}
              type="date"
              value={viewModel.draftPeriod.dateStart}
            />
          </label>
          <label>
            <span>Au</span>
            <input
              aria-label="Date de fin"
              onChange={(event) => viewModel.updateDraftPeriod(
                'dateEnd',
                event.target.value,
              )}
              type="date"
              value={viewModel.draftPeriod.dateEnd}
            />
          </label>
          <button className="dashboard-period-submit" type="submit">
            Appliquer
          </button>
        </form>
      </div>

      {viewModel.periodError && (
        <p className="dashboard-alert" role="alert">{viewModel.periodError}</p>
      )}
      {viewModel.indicatorsError && (
        <div className="dashboard-alert" role="alert">
          <span>{viewModel.indicatorsError}</span>
          <button onClick={viewModel.retry} type="button">Réessayer</button>
        </div>
      )}
      {viewModel.isLoadingIndicators && (
        <p aria-live="polite" className="dashboard-loading" role="status">
          Chargement des indicateurs…
        </p>
      )}

      {indicators && (
        <>
          <div className="dashboard-metrics-grid">
            {metricCard({
              title: 'Clients',
              value: countFormatter.format(indicators.overview.totalClients),
              detail: `+${countFormatter.format(indicators.overview.newClients)} sur la période`,
              icon: '♙',
            })}
            {metricCard({
              title: 'Comptes actifs',
              value: countFormatter.format(indicators.overview.activeAccounts),
              detail: `${countFormatter.format(indicators.overview.totalAccounts)} comptes au total`,
              icon: '▣',
            })}
            {metricCard({
              title: 'Dépôts sur la période',
              value: formatAmount(indicators.transactions.depot.totalAmount),
              detail: `${countFormatter.format(indicators.transactions.depot.count)} opérations`,
              icon: '↓',
            })}
            {metricCard({
              title: 'Retraits sur la période',
              value: formatAmount(indicators.transactions.retrait.totalAmount),
              detail: `${countFormatter.format(indicators.transactions.retrait.count)} opérations`,
              icon: '↑',
            })}
            {metricCard({
              title: 'Crédits en cours',
              value: countFormatter.format(indicators.overview.activeCredits),
              detail: `${formatAmount(indicators.overview.remainingPrincipal)} de capital restant dû`,
              icon: '₣',
            })}
            {metricCard({
              title: 'Échéances en retard',
              value: countFormatter.format(indicators.overview.overdueInstallments),
              detail: `${formatAmount(indicators.overview.unpaidInstallmentsAmount)} restant sur les échéances impayées`,
              icon: '!',
              variant: 'dashboard-metric-alert',
            })}
          </div>

          {indicators.creditRequestsAwaitingValidation > 0 && (
            <p className="dashboard-queue-notice">
              {countFormatter.format(indicators.creditRequestsAwaitingValidation)}
              {' '}
              demande(s) de crédit en attente de validation.
            </p>
          )}

          <div className="dashboard-content-grid">
            <section aria-labelledby="dashboard-volume-title" className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2 id="dashboard-volume-title">Volume par opération</h2>
                  <p>
                    {countFormatter.format(indicators.overview.totalTransactions)}
                    {' opérations · Volume brut '}
                    {formatAmount(indicators.overview.grossVolume)}
                    {' · Flux net hors virements '}
                    {formatAmount(indicators.overview.netFlow)}
                  </p>
                </div>
              </div>
              <div className="dashboard-volume-list">
                {Object.values(indicators.transactions).map((statistic) => {
                  const amount = Number(statistic.totalAmount);
                  const maximum = Math.max(
                    ...Object.values(indicators.transactions)
                      .map((item) => Number(item.totalAmount)),
                    0,
                  );
                  const width = maximum === 0 ? 0 : (amount / maximum) * 100;

                  return (
                    <div className="dashboard-volume-row" key={statistic.type}>
                      <div className="dashboard-volume-label">
                        <span>{TRANSACTION_LABELS[statistic.type]}</span>
                        <span>{formatAmount(statistic.totalAmount)}</span>
                      </div>
                      <div
                        aria-label={`${TRANSACTION_LABELS[statistic.type]} ${Math.round(width)} %`}
                        className="dashboard-volume-track"
                        role="img"
                      >
                        <span
                          className={`dashboard-volume-bar dashboard-volume-${statistic.type}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {canViewTransactions && (
              <section aria-labelledby="dashboard-transactions-title" className="dashboard-panel dashboard-activity-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <h2 id="dashboard-transactions-title">Dernières opérations</h2>
                    <p>Transactions de la période sélectionnée</p>
                  </div>
                </div>
                {viewModel.transactionsError && (
                  <p className="dashboard-inline-error" role="alert">
                    {viewModel.transactionsError}
                  </p>
                )}
                {viewModel.isLoadingTransactions ? (
                  <p aria-live="polite" className="dashboard-loading" role="status">
                    Chargement des opérations…
                  </p>
                ) : (
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Client / Référence</th>
                          <th scope="col">Opération</th>
                          <th scope="col">Compte</th>
                          <th scope="col">Montant</th>
                          <th scope="col">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewModel.transactions.map((transaction) => (
                          <tr key={transaction.uuid}>
                            <td>{formatDateTime(transaction.date)}</td>
                            <td>
                              <strong>{transaction.clientName || 'Client non renseigné'}</strong>
                              <small>{transaction.reference}</small>
                            </td>
                            <td>{TRANSACTION_LABELS[transaction.type]}</td>
                            <td>{transaction.accountNumber || '—'}</td>
                            <td className="dashboard-amount-cell">
                              {formatAmount(transaction.amount, transaction.currency)}
                            </td>
                            <td>
                              <span className={`dashboard-status dashboard-status-${transaction.status}`}>
                                {STATUS_LABELS[transaction.status]}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {viewModel.transactions.length === 0 && (
                          <tr>
                            <td className="dashboard-empty" colSpan="6">
                              Aucune transaction pour cette période.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default DashboardView;
