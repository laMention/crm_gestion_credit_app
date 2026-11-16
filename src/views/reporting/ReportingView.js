import useReportingViewModel from '../../viewmodels/useReportingViewModel';
import './ReportingView.css';

const TRANSACTION_LABELS = {
  depot: 'Dépôt', retrait: 'Retrait', virement: 'Virement',
  paiement_facture: 'Paiement facture', deboursement: 'Décaissement', remboursement: 'Remboursement',
};

function amount(value, currency = 'XOF') {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(parsed);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function ReportingView({ canExport, user }) {
  const vm = useReportingViewModel({ canExport, user });
  const general = vm.indicators?.indicateurs_generaux;
  const credit = vm.indicators?.indicateurs_credits;
  const stats = vm.indicators?.transactions;
  const isNetworkRole = ['administrateur', 'direction'].includes(user?.role);

  return (
    <section className="reporting-page" aria-labelledby="reporting-title">
      <header className="reporting-heading">
        <div>
          <p className="users-eyebrow">Pilotage de l’activité</p>
          <h1 id="reporting-title">Reporting et exports</h1>
          <p>Indicateurs consolidés, opérations et rapports quotidiens de votre périmètre.</p>
        </div>
        <div className="reporting-actions">
          {canExport && <button className="users-button users-button-secondary" disabled={vm.busy} onClick={vm.exportCsv} type="button">Exporter en CSV</button>}
          <button className="users-button users-button-primary" disabled={vm.busy || (isNetworkRole && !vm.filters.agencyId)} onClick={vm.generate} type="button">{vm.busy ? 'Traitement…' : 'Générer le rapport du jour'}</button>
        </div>
      </header>

      <form className="reporting-filter-card" onSubmit={vm.applyFilters}>
        <label>Date de début<input type="date" value={vm.draft.dateStart} onChange={(event) => vm.setDraft({ ...vm.draft, dateStart: event.target.value })} /></label>
        <label>Date de fin<input type="date" value={vm.draft.dateEnd} onChange={(event) => vm.setDraft({ ...vm.draft, dateEnd: event.target.value })} /></label>
        {isNetworkRole && (
          <label>Agence
            <select value={vm.draft.agencyId} onChange={(event) => vm.setDraft({ ...vm.draft, agencyId: event.target.value })}>
              <option value="">Toutes les agences</option>
              {vm.agencies.map((agency) => <option key={agency.uuid} value={agency.id}>{agency.name}</option>)}
            </select>
          </label>
        )}
        <label>Type d’opération
          <select value={vm.draft.transactionType} onChange={(event) => vm.setDraft({ ...vm.draft, transactionType: event.target.value })}>
            <option value="">Tous les types</option>
            {Object.entries(TRANSACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="users-button users-button-primary" disabled={vm.loading} type="submit">Appliquer</button>
      </form>

      {vm.error && <p className="auth-error reporting-message" role="alert">{vm.error}</p>}
      {vm.notice && <p className="reporting-notice" role="status">{vm.notice}</p>}
      {vm.loading ? <p className="reporting-state">Chargement du reporting…</p> : vm.indicators && (
        <>
          <div className="reporting-period">Période : <strong>{formatDate(vm.indicators.periode?.date_debut)} – {formatDate(vm.indicators.periode?.date_fin)}</strong><span>{vm.indicators.perimetre}</span></div>
          <div className="reporting-metrics">
            <article><span>Clients</span><strong>{general?.nombre_total_clients ?? 0}</strong><small>+{general?.nombre_nouveaux_clients ?? 0} sur la période</small></article>
            <article><span>Comptes actifs</span><strong>{general?.nombre_comptes_actifs ?? 0}</strong><small>{general?.nombre_total_comptes ?? 0} comptes au total</small></article>
            <article><span>Transactions</span><strong>{general?.nombre_total_transactions ?? 0}</strong><small>{amount(general?.volume_brut_operations)}</small></article>
            <article><span>Crédits en cours</span><strong>{general?.nombre_credits_en_cours ?? 0}</strong><small>Capital restant {amount(general?.capital_restant_du)}</small></article>
            <article><span>Échéances en retard</span><strong>{general?.nombre_echeances_en_retard ?? 0}</strong><small>Impayés {amount(general?.montant_total_echeances_impayees)}</small></article>
            <article><span>Dossiers en validation</span><strong>{credit?.demandes_en_attente_validation ?? 0}</strong><small>En instruction {credit?.demandes_en_instruction ?? 0}</small></article>
          </div>

          <section className="reporting-card">
            <div className="reporting-card-heading"><div><h2>Opérations par type</h2><p>Totaux sur la période et les filtres sélectionnés.</p></div></div>
            <div className="reporting-table-wrap"><table className="reporting-table"><thead><tr><th>Type</th><th>Nombre</th><th>Montant total</th><th>Montant moyen</th></tr></thead><tbody>
              {Object.entries(stats || {}).map(([type, row]) => <tr key={type}><td>{TRANSACTION_LABELS[type] || type}</td><td>{row.nombre}</td><td>{amount(row.montant_total)}</td><td>{amount(row.montant_moyen)}</td></tr>)}
            </tbody></table></div>
          </section>

          <section className="reporting-card">
            <div className="reporting-card-heading"><div><h2>Transactions de la période</h2><p>{vm.transactions.length} opération(s) sur cette page</p></div></div>
            <div className="reporting-table-wrap"><table className="reporting-table"><thead><tr><th>Référence</th><th>Date</th><th>Type</th><th>Montant</th><th>Agence</th></tr></thead><tbody>
              {vm.transactions.length ? vm.transactions.map((row) => <tr key={row.reference_transaction}><td>{row.reference_transaction}</td><td>{formatDate(row.date_transaction)}</td><td>{TRANSACTION_LABELS[row.type_transaction] || row.type_transaction}</td><td>{amount(row.montant, row.devise || 'XOF')}</td><td>{row.code_agence || '—'}</td></tr>) : <tr><td className="reporting-empty" colSpan="5">Aucune transaction pour ces filtres.</td></tr>}
            </tbody></table></div>
          </section>

          <section className="reporting-card">
            <div className="reporting-card-heading"><div><h2>Rapports quotidiens générés</h2><p>Rapports enregistrés pour la période choisie.</p></div><button className="users-button users-button-secondary" onClick={vm.refresh} type="button">Actualiser</button></div>
            <div className="reporting-table-wrap"><table className="reporting-table"><thead><tr><th>Date</th><th>Agence</th><th>Statut</th><th>Généré le</th></tr></thead><tbody>
              {vm.reports.length ? vm.reports.map((row) => <tr key={row.uuid}><td>{formatDate(row.date_reporting)}</td><td>{row.agence?.nom || row.agence?.code || '—'}</td><td><span className="reporting-status">{row.statut_generation}</span></td><td>{formatDate(row.genere_le)}</td></tr>) : <tr><td className="reporting-empty" colSpan="4">Aucun rapport quotidien enregistré sur cette période.</td></tr>}
            </tbody></table></div>
          </section>
        </>
      )}
    </section>
  );
}

export default ReportingView;
