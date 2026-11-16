import useAuditLogsViewModel from '../../viewmodels/useAuditLogsViewModel';
import './AuditLogsView.css';

const ROLES = ['administrateur', 'direction', 'chef_agence', 'conseiller', 'caissier'];
const MODULES = ['authentification', 'utilisateurs', 'clients', 'comptes', 'transactions', 'credits', 'reportings'];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function pretty(value) {
  return JSON.stringify(value || {}, null, 2);
}

function AuditLogDetails({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="audit-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="audit-detail-title" aria-modal="true" className="audit-detail-modal" role="dialog">
        <header><div><p className="users-eyebrow">Entrée immuable</p><h2 id="audit-detail-title">Détail de l’événement</h2></div><button aria-label="Fermer" className="audit-close" onClick={onClose} type="button">×</button></header>
        <dl className="audit-detail-grid">
          <div><dt>Date et heure</dt><dd>{formatDate(entry.date_heure)}</dd></div>
          <div><dt>Utilisateur</dt><dd>{entry.utilisateur ? `${entry.utilisateur.prenom} ${entry.utilisateur.nom}` : 'Système'}</dd></div>
          <div><dt>Rôle</dt><dd>{entry.role_utilisateur || '—'}</dd></div>
          <div><dt>Agence (ID)</dt><dd>{entry.agence_id || '—'}</dd></div>
          <div><dt>Module / action</dt><dd>{entry.module} · {entry.action}</dd></div>
          <div><dt>Ressource</dt><dd>{entry.type_ressource || '—'} {entry.enregistrement_id ? `· #${entry.enregistrement_id}` : ''}</dd></div>
          <div><dt>Résultat</dt><dd><span className={`audit-result is-${entry.resultat}`}>{entry.resultat}</span></dd></div>
          <div><dt>Adresse IP</dt><dd>{entry.adresse_ip || '—'}</dd></div>
          <div className="audit-detail-wide"><dt>Description</dt><dd>{entry.description || 'Aucune description'}</dd></div>
          <div className="audit-detail-wide"><dt>Anciennes valeurs</dt><dd><pre>{pretty(entry.anciennes_valeurs)}</pre></dd></div>
          <div className="audit-detail-wide"><dt>Nouvelles valeurs</dt><dd><pre>{pretty(entry.nouvelles_valeurs)}</pre></dd></div>
          <div className="audit-detail-wide"><dt>Navigateur / client</dt><dd className="audit-user-agent">{entry.user_agent || '—'}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function AuditLogsView({ user }) {
  const vm = useAuditLogsViewModel({ user });
  const networkRole = ['administrateur', 'direction'].includes(user?.role);

  return (
    <section aria-labelledby="audit-title" className="audit-page">
      <header className="audit-heading">
        <div><p className="users-eyebrow">Sécurité et traçabilité</p><h1 id="audit-title">Journal d’audit</h1><p>Historique en lecture seule des actions effectuées dans le CRM.</p></div>
        <div className="audit-total"><strong>{vm.meta.total || 0}</strong><span>entrée(s)</span></div>
      </header>

      <form className="audit-filters" onSubmit={vm.applyFilters}>
        <label>Date de début<input type="date" max={vm.today} value={vm.draft.dateStart} onChange={(event) => vm.setDraft({ ...vm.draft, dateStart: event.target.value })} /></label>
        <label>Date de fin<input type="date" max={vm.today} value={vm.draft.dateEnd} onChange={(event) => vm.setDraft({ ...vm.draft, dateEnd: event.target.value })} /></label>
        {networkRole && <label>Agence<select value={vm.draft.agencyId} onChange={(event) => vm.setDraft({ ...vm.draft, agencyId: event.target.value })}><option value="">Toutes les agences</option>{vm.agencies.map((agency) => <option key={agency.uuid} value={agency.id}>{agency.name}</option>)}</select></label>}
        <label>Rôle<select value={vm.draft.role} onChange={(event) => vm.setDraft({ ...vm.draft, role: event.target.value })}><option value="">Tous</option>{ROLES.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}</select></label>
        <label>Module<select value={vm.draft.module} onChange={(event) => vm.setDraft({ ...vm.draft, module: event.target.value })}><option value="">Tous</option>{MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</select></label>
        <label>Résultat<select value={vm.draft.result} onChange={(event) => vm.setDraft({ ...vm.draft, result: event.target.value })}><option value="">Tous</option><option value="succes">Succès</option><option value="echec">Échec</option></select></label>
        <label className="audit-filter-wide">Action contient<input maxLength="100" placeholder="Ex. utilisateur.modifie" value={vm.draft.action} onChange={(event) => vm.setDraft({ ...vm.draft, action: event.target.value })} /></label>
        <label>UUID utilisateur<input placeholder="UUID" value={vm.draft.userUuid} onChange={(event) => vm.setDraft({ ...vm.draft, userUuid: event.target.value })} /></label>
        <label>Type de ressource<input maxLength="100" value={vm.draft.resourceType} onChange={(event) => vm.setDraft({ ...vm.draft, resourceType: event.target.value })} /></label>
        <label>ID enregistrement<input min="1" type="number" value={vm.draft.recordId} onChange={(event) => vm.setDraft({ ...vm.draft, recordId: event.target.value })} /></label>
        <div className="audit-filter-actions"><button className="users-button users-button-primary" disabled={vm.loading} type="submit">Filtrer</button><button className="users-button users-button-secondary" disabled={vm.loading} onClick={vm.clearFilters} type="button">Réinitialiser</button></div>
      </form>

      {vm.error && <p className="auth-error audit-error" role="alert">{vm.error}</p>}
      <section className="audit-list-card">
        <div className="audit-list-heading"><div><h2>Événements enregistrés</h2><p>Les données personnelles sensibles sont masquées par le serveur.</p></div><button className="users-button users-button-secondary" disabled={vm.loading} onClick={vm.refresh} type="button">Actualiser</button></div>
        <div className="audit-table-scroll"><table className="audit-table"><thead><tr><th>Date et heure</th><th>Utilisateur</th><th>Module</th><th>Action</th><th>Ressource</th><th>Résultat</th><th aria-label="Détail" /></tr></thead><tbody>
          {vm.loading ? <tr><td className="audit-empty" colSpan="7">Chargement du journal…</td></tr> : vm.logs.length ? vm.logs.map((entry) => <tr key={entry.uuid}><td>{formatDate(entry.date_heure)}</td><td>{entry.utilisateur ? `${entry.utilisateur.prenom} ${entry.utilisateur.nom}` : 'Système'}<small>{entry.role_utilisateur || '—'}</small></td><td>{entry.module}</td><td><strong>{entry.action}</strong><small>{entry.description || ''}</small></td><td>{entry.type_ressource || '—'}{entry.enregistrement_id ? ` · #${entry.enregistrement_id}` : ''}</td><td><span className={`audit-result is-${entry.resultat}`}>{entry.resultat}</span></td><td><button className="audit-detail-button" disabled={vm.detailLoading} onClick={() => vm.openDetail(entry.uuid)} type="button">Détail</button></td></tr>) : <tr><td className="audit-empty" colSpan="7">Aucune entrée ne correspond aux filtres.</td></tr>}
        </tbody></table></div>
        <footer className="audit-pagination"><span>{vm.meta.total || 0} entrée(s) · page {vm.meta.current_page || 1} sur {vm.meta.last_page || 1}</span><div><button className="users-button users-button-secondary" disabled={vm.loading || (vm.meta.current_page || 1) <= 1} onClick={() => vm.changePage((vm.meta.current_page || 1) - 1)} type="button">Précédent</button><button className="users-button users-button-secondary" disabled={vm.loading || (vm.meta.current_page || 1) >= (vm.meta.last_page || 1)} onClick={() => vm.changePage((vm.meta.current_page || 1) + 1)} type="button">Suivant</button></div></footer>
      </section>
      {vm.detailLoading && <div className="audit-loading-overlay" role="status">Chargement du détail…</div>}
      <AuditLogDetails entry={vm.selectedLog} onClose={() => vm.setSelectedLog(null)} />
    </section>
  );
}

export default AuditLogsView;
