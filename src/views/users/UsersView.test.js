import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UsersView from './UsersView';

const user = {
  uuid: 'user-123',
  nom: 'Kouassi',
  prenom: 'Aminata',
  adresse: 'Centre-ville',
  telephone: '0700000000',
  ville: 'Abidjan',
  email: 'aminata@example.test',
  role: 'conseiller',
  actif: true,
  derniere_connexion_le: '2026-11-15T08:30:00Z',
  agence: {
    uuid: 'agency-123',
    code: 'AG-TEST',
    nom: 'Agence de test',
    ville: 'Abidjan',
  },
};

const admin = {
  uuid: 'admin-123',
  prenom: 'Admin',
  nom: 'CRM',
  email: 'admin@example.test',
  role: 'administrateur',
};

const permissions = [
  'consulter_tout',
  'creer',
  'modifier',
  'activer',
  'desactiver',
].map((action) => ({
  id: `utilisateurs.${action}`,
  identifiant: action,
  libelle: action,
  description: '',
  module: 'utilisateurs',
  module_libelle: 'Utilisateurs',
}));

const roles = [
  {
    id: 'administrateur',
    identifiant: 'administrateur',
    libelle: 'Administrateur',
    description: 'Gère les utilisateurs.',
    permissions: [],
  },
  {
    id: 'conseiller',
    identifiant: 'conseiller',
    libelle: 'Conseiller',
    description: 'Gère les dossiers de son agence.',
    permissions: [
      {
        id: 'clients.creer',
        identifiant: 'creer',
        libelle: 'Créer un client',
        module: 'clients',
        module_libelle: 'Clients',
      },
    ],
  },
];

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

function usersResponse(items = [user], currentPage = 1, lastPage = 1) {
  return {
    data: items,
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      total: items.length,
      per_page: 10,
    },
  };
}

function renderUsersView() {
  return render(<UsersView permissions={permissions} user={admin} />);
}

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/roles')) {
      return jsonResponse({ data: roles });
    }

    if (url.includes('/users?')) {
      return jsonResponse(usersResponse());
    }

    if (url.endsWith('/users/user-123/permissions')) {
      return jsonResponse({
        data: {
          utilisateur_uuid: user.uuid,
          role: user.role,
          permissions: roles[1].permissions,
        },
      });
    }

    if (url.endsWith('/users/user-123/desactiver')) {
      return jsonResponse({ data: { ...user, actif: false } });
    }

    if (url.endsWith('/users') && !url.includes('?')) {
      return jsonResponse({ data: { ...user, uuid: 'user-created' } }, 201);
    }

    return jsonResponse({ data: user });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('lists users using the real filters and displays role permissions', async () => {
  renderUsersView();

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  expect(screen.getByText('Agence de test')).toBeInTheDocument();
  expect(screen.getByText('Conseiller', { selector: 'span' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un utilisateur' }), {
    target: { value: 'Aminata' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par rôle' }), {
    target: { value: 'conseiller' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par statut' }), {
    target: { value: '1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/users?per_page=10&page=1&recherche=Aminata&role=conseiller&actif=1',
      expect.any(Object),
    );
  });

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Permissions' }));
  expect(await screen.findByText('Créer un client')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/v1/users/user-123/permissions',
    expect.any(Object),
  );
});

test('creates an agency user with the backend fields and role catalogue', async () => {
  renderUsersView();
  await screen.findByRole('option', { name: 'Conseiller' });
  fireEvent.click(await screen.findByRole('button', { name: 'Nouvel utilisateur' }));

  fireEvent.change(screen.getByLabelText('Prénom'), {
    target: { value: 'Awa' },
  });
  fireEvent.change(screen.getByLabelText('Nom'), {
    target: { value: 'Traoré' },
  });
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
    target: { value: 'awa.traore@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Téléphone'), {
    target: { value: '0701111111' },
  });
  fireEvent.change(screen.getByLabelText('Ville'), {
    target: { value: 'Abidjan' },
  });
  fireEvent.change(screen.getByLabelText('Adresse'), {
    target: { value: 'Plateau' },
  });
  fireEvent.change(screen.getByLabelText('Rôle'), {
    target: { value: 'conseiller' },
  });
  expect(await screen.findByText('Gère les dossiers de son agence.')).toBeInTheDocument();
  fireEvent.change(
    screen.getByLabelText('Identifiant de l’agence (obligatoire)'),
    { target: { value: '12' } },
  );
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: 'mot-de-passe-valide' },
  });
  fireEvent.change(screen.getByLabelText('Confirmation du mot de passe'), {
    target: { value: 'mot-de-passe-valide' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Créer l’utilisateur' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nom: 'Traoré',
          prenom: 'Awa',
          email: 'awa.traore@example.test',
          telephone: '0701111111',
          adresse: 'Plateau',
          ville: 'Abidjan',
          role: 'conseiller',
          agence_id: 12,
          password: 'mot-de-passe-valide',
          password_confirmation: 'mot-de-passe-valide',
        }),
      }),
    );
  });

  expect(await screen.findByRole('status')).toHaveTextContent('L’utilisateur a été créé.');
});

test('updates a user without inventing role or agency fields', async () => {
  renderUsersView();

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
  fireEvent.change(screen.getByLabelText('Téléphone'), {
    target: { value: '0709999999' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/users/user-123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          nom: 'Kouassi',
          prenom: 'Aminata',
          email: 'aminata@example.test',
          telephone: '0709999999',
          adresse: 'Centre-ville',
          ville: 'Abidjan',
        }),
      }),
    );
  });

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Les informations de l’utilisateur ont été mises à jour.',
  );
});

test('hides user management actions when the authenticated role lacks permission', async () => {
  render(<UsersView permissions={[]} user={admin} />);

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nouvel utilisateur' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument();
});

test('confirms account deactivation and calls the revocation endpoint', async () => {
  renderUsersView();

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Désactiver' }));
  expect(
    screen.getByText(/ses jetons de connexion seront révoqués/i),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Désactiver le compte' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/users/user-123/desactiver',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
  expect(await screen.findByRole('status')).toHaveTextContent(
    'L’utilisateur a été désactivé.',
  );
});
