import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardView from './DashboardView';

const indicators = {
  periode: {
    date_debut: '2025-10-01',
    date_fin: '2025-10-14',
  },
  perimetre: 'agence:7',
  indicateurs_generaux: {
    nombre_total_clients: 120,
    nombre_nouveaux_clients: 8,
    nombre_total_comptes: 180,
    nombre_comptes_actifs: 170,
    nombre_comptes_bloques: 5,
    nombre_comptes_clotures: 5,
    nombre_total_transactions: 1,
    volume_brut_operations: '1250.00',
    flux_net_hors_virements: '1250.00',
    nombre_credits_en_cours: 12,
    nombre_credits_debourses_sur_periode: 1,
    montant_total_credits_debourses_sur_periode: '0.00',
    nombre_credits_soldes: 2,
    capital_restant_du: '45000.00',
    nombre_echeances_en_retard: 1,
    montant_total_echeances_impayees: '150.00',
    montant_total_remboursements_sur_periode: '0.00',
  },
  indicateurs_credits: {
    demandes_en_instruction: 2,
    demandes_en_attente_validation: 1,
    credits_approuves_sur_periode: 0,
    credits_rejetes_sur_periode: 0,
    credits_debourses_sur_periode: 1,
    credits_soldes: 2,
    credits_avec_echeances_en_retard: 1,
    credits_avec_echeances_impayees_plus_de_30_jours: 0,
  },
  transactions: {
    depot: { nombre: 1, montant_total: '1250.00', montant_moyen: '1250.00' },
    retrait: { nombre: 0, montant_total: '0.00', montant_moyen: '0.00' },
    virement: { nombre: 0, montant_total: '0.00', montant_moyen: '0.00' },
    paiement_facture: { nombre: 0, montant_total: '0.00', montant_moyen: '0.00' },
    deboursement: { nombre: 0, montant_total: '0.00', montant_moyen: '0.00' },
    remboursement: { nombre: 0, montant_total: '0.00', montant_moyen: '0.00' },
  },
};

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('loads indicators and the latest transactions from the Laravel endpoints', async () => {
  global.fetch
    .mockReturnValueOnce(jsonResponse({ data: indicators }))
    .mockReturnValueOnce(jsonResponse({
      data: [
        {
          uuid: 'transaction-1',
          reference_transaction: 'TRX-001',
          type_transaction: 'depot',
          montant: '1250.00',
          devise: 'XOF',
          date_transaction: '2025-10-14T09:42:00.000000Z',
          statut_transaction: 'terminee',
          client: {
            uuid: 'client-1',
            code_client: 'CL-001',
            nom_client: 'Kouassi',
            prenom_client: 'Aminata',
          },
          compte_source: {
            uuid: 'account-1',
            numero_compte: '001234',
            type_compte: 'courant',
          },
        },
      ],
      meta: { current_page: 1, per_page: 6, total: 1 },
    }));

  render(<DashboardView canViewTransactions />);

  expect(await screen.findByText(/Vue agence/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
  expect(screen.getByText('Aminata Kouassi')).toBeInTheDocument();
  expect(screen.getByText('TRX-001')).toBeInTheDocument();
  expect(screen.getByText('001234')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringMatching(/\/reportings\/indicateurs\?date_debut=\d{4}-\d{2}-01&date_fin=\d{4}-\d{2}-\d{2}$/),
    expect.objectContaining({ method: 'GET' }),
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringMatching(/\/transactions\?per_page=6&date_debut=\d{4}-\d{2}-01&date_fin=\d{4}-\d{2}-\d{2}$/),
    expect.objectContaining({ method: 'GET' }),
  );
});

test('does not call the transaction endpoint without its permission', async () => {
  global.fetch.mockReturnValueOnce(jsonResponse({ data: indicators }));

  render(<DashboardView canViewTransactions={false} />);

  expect(await screen.findByText(/Vue agence/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Dernières opérations' })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('validates the selected period before sending a request', async () => {
  global.fetch.mockReturnValueOnce(jsonResponse({ data: indicators }));

  render(<DashboardView canViewTransactions={false} />);
  await screen.findByText(/Vue agence/);

  fireEvent.change(screen.getByLabelText('Date de début'), {
    target: { value: '2025-10-15' },
  });
  fireEvent.change(screen.getByLabelText('Date de fin'), {
    target: { value: '2025-10-14' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'La date de début doit précéder la date de fin.',
  );
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});

test('shows API errors instead of rendering fabricated indicator values', async () => {
  global.fetch.mockReturnValueOnce(
    jsonResponse({ message: 'Accès refusé.' }, 403),
  );

  render(<DashboardView canViewTransactions={false} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé.');
  expect(screen.queryByRole('heading', { name: 'Clients' })).not.toBeInTheDocument();
});
