import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const authenticatedUser = {
  uuid: 'user-123',
  nom: 'Kouassi',
  prenom: 'Aminata',
  email: 'aminata@example.test',
  role: 'conseiller',
  agence: {
    uuid: 'agency-123',
    code: 'AG-TEST',
    nom: 'Agence de test',
    ville: 'Abidjan',
  },
};

function currentPermissionsResponse(role = 'administrateur', permissions = []) {
  return jsonResponse({
    data: {
      utilisateur_uuid: authenticatedUser.uuid,
      role,
      permissions,
    },
  });
}

const userManagementPermission = {
  id: 'utilisateurs.consulter_tout',
  identifiant: 'consulterTout',
  libelle: 'Consulter la liste des utilisateurs',
  description: 'Consulter les utilisateurs autorisés.',
  module: 'utilisateurs',
  module_libelle: 'Utilisateurs',
};

const dashboardPermission = {
  id: 'reportings.consulter_tout',
  identifiant: 'consulterTout',
  libelle: 'Consulter les indicateurs',
  description: 'Consulter les indicateurs autorisés.',
  module: 'reportings',
  module_libelle: 'Reportings',
};

function dashboardIndicatorsResponse() {
  return jsonResponse({
    data: {
      periode: {
        date_debut: '2025-10-01',
        date_fin: '2025-10-14',
      },
      perimetre: 'reseau',
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
    },
  });
}

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('displays the sign-in form without exposing the private page', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  expect(screen.getByLabelText('Identifiant professionnel')).toHaveAttribute(
    'type',
    'email',
  );
  expect(
    screen.queryByText('Votre session est sécurisée.'),
  ).not.toBeInTheDocument();
});

test('signs in with the Laravel contract and opens the protected session view', async () => {
  global.fetch.mockReturnValueOnce(
    jsonResponse({
      message: 'Connexion réussie.',
      data: {
        token: 'secret-token',
        token_type: 'Bearer',
        user: authenticatedUser,
      },
    }),
  ).mockReturnValueOnce(
    currentPermissionsResponse('conseiller', [userManagementPermission]),
  );

  render(<App />);
  fireEvent.change(screen.getByLabelText('Identifiant professionnel'), {
    target: { value: 'aminata@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: 'correct-password' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Se souvenir de moi' }));
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

  expect(await screen.findByText('Votre session est sécurisée.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/v1/auth/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'aminata@example.test',
        password: 'correct-password',
        device_name: 'CRM Gestion de Crédit',
      }),
    }),
  );
  expect(window.localStorage.getItem('crm.auth.token')).toBe('secret-token');
});

test('restores a saved session from the authenticated profile endpoint', async () => {
  window.sessionStorage.setItem('crm.auth.token', 'existing-token');
  global.fetch.mockReturnValueOnce(
    jsonResponse({
      data: authenticatedUser,
    }),
  ).mockReturnValueOnce(
    currentPermissionsResponse('conseiller', [userManagementPermission]),
  );

  render(<App />);

  expect(await screen.findByText('Votre session est sécurisée.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/v1/auth/profile',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer existing-token',
      }),
    }),
  );
});

test('shows the backend login error and remains on the sign-in page', async () => {
  global.fetch.mockReturnValueOnce(
    jsonResponse(
      { message: 'Informations de connexion invalides.' },
      401,
    ),
  );

  render(<App />);
  fireEvent.change(screen.getByLabelText('Identifiant professionnel'), {
    target: { value: 'aminata@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: 'wrong-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

  expect(
    await screen.findByRole('alert'),
  ).toHaveTextContent('Informations de connexion invalides.');
  expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
});

test('does not expose user management when the current role lacks permission', async () => {
  global.fetch.mockReturnValueOnce(
    jsonResponse({
      message: 'Connexion réussie.',
      data: {
        token: 'limited-token',
        token_type: 'Bearer',
        user: authenticatedUser,
      },
    }),
  ).mockReturnValueOnce(currentPermissionsResponse('conseiller'));

  render(<App />);
  fireEvent.change(screen.getByLabelText('Identifiant professionnel'), {
    target: { value: 'aminata@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: 'correct-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

  expect(
    await screen.findByText('Votre rôle ne donne pas accès à la gestion des utilisateurs.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Gestion des utilisateurs' }),
  ).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('opens the dashboard for authorized users and requests real reporting indicators', async () => {
  global.fetch
    .mockReturnValueOnce(
      jsonResponse({
        message: 'Connexion réussie.',
        data: {
          token: 'dashboard-token',
          token_type: 'Bearer',
          user: { ...authenticatedUser, role: 'administrateur', agence: null },
        },
      }),
    )
    .mockReturnValueOnce(
      currentPermissionsResponse('administrateur', [dashboardPermission]),
    )
    .mockReturnValueOnce(dashboardIndicatorsResponse());

  render(<App />);
  fireEvent.change(screen.getByLabelText('Identifiant professionnel'), {
    target: { value: 'admin@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: 'correct-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

  expect(await screen.findByText(/demande\(s\) de crédit en attente/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
  expect(screen.getByText('120', { selector: '.dashboard-metric-value' })).toBeInTheDocument();
  expect(screen.getByText(/1 demande\(s\) de crédit en attente/)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(global.fetch).toHaveBeenLastCalledWith(
    expect.stringMatching(/\/reportings\/indicateurs\?date_debut=\d{4}-\d{2}-01&date_fin=\d{4}-\d{2}-\d{2}$/),
    expect.objectContaining({ method: 'GET' }),
  );
});

test('revokes the token on the backend and clears the local session on logout', async () => {
  window.localStorage.setItem('crm.auth.token', 'existing-token');
  global.fetch
    .mockReturnValueOnce(jsonResponse({ data: authenticatedUser }))
    .mockReturnValueOnce(
      currentPermissionsResponse('conseiller', [userManagementPermission]),
    )
    .mockReturnValueOnce(jsonResponse({ message: 'Déconnexion réussie.' }));

  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });
  expect(global.fetch).toHaveBeenLastCalledWith(
    'http://localhost:8000/api/v1/auth/logout',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer existing-token',
      }),
    }),
  );
  expect(window.localStorage.getItem('crm.auth.token')).toBeNull();
});
