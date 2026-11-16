import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClientsView from './ClientsView';

const client = {
  uuid: 'client-123',
  code_client: 'CLI-AG-001',
  nom_client: 'Kouassi',
  prenom_client: 'Aminata',
  adresse_client: 'Centre-ville',
  telephone_client: '0701000000',
  ville_client: 'Abidjan',
  email_client: 'aminata.client@example.test',
  date_naissance: '1990-04-12',
  lieu_naissance: 'Abidjan',
  sexe: 'F',
  profession: 'Commerçante',
  statut: 'actif',
  agence: {
    uuid: 'agency-123',
    code: 'AG-TEST',
    nom: 'Agence de test',
  },
  comptes_count: 2,
  cree_le: '2026-11-01T10:00:00Z',
  modifie_le: '2026-11-02T10:00:00Z',
};

const user = {
  uuid: 'user-123',
  prenom: 'Awa',
  nom: 'Conseillère',
  agence: {
    uuid: 'agency-123',
    code: 'AG-TEST',
    nom: 'Agence de test',
  },
};

const permissions = [
  'consulter_tout',
  'consulter',
  'creer',
  'modifier',
].map((action) => ({
  id: `clients.${action}`,
  identifiant: action,
  libelle: action,
  description: '',
  module: 'clients',
  module_libelle: 'Clients',
}));

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

function clientsResponse(items = [client], currentPage = 1, lastPage = 1, total = items.length) {
  return {
    data: items,
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      total,
      per_page: 10,
    },
  };
}

function renderClientsView(viewPermissions = permissions) {
  return render(<ClientsView permissions={viewPermissions} user={user} />);
}

beforeEach(() => {
  global.fetch = jest.fn(() => jsonResponse(clientsResponse()));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('lists clients with API filters and permission-gated actions', async () => {
  global.fetch
    .mockReturnValueOnce(jsonResponse(clientsResponse([client], 1, 2, 11)))
    .mockReturnValueOnce(jsonResponse(clientsResponse([client], 1, 2, 11)))
    .mockReturnValueOnce(jsonResponse(clientsResponse([client], 2, 2, 11)));

  renderClientsView();

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  expect(screen.getByText('CLI-AG-001')).toBeInTheDocument();
  expect(screen.getByText('Agence de test')).toBeInTheDocument();
  expect(screen.getByText('Actif', { selector: '.clients-status' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un client' }), {
    target: { value: 'Aminata' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par statut' }), {
    target: { value: 'actif' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/clients?per_page=10&page=1&recherche=Aminata&statut=actif',
      expect.any(Object),
    );
  });

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeEnabled();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
  await waitFor(() => {
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/clients?per_page=10&page=2&recherche=Aminata&statut=actif',
      expect.any(Object),
    );
  });
});

test('opens the client detail using the accessible UUID endpoint', async () => {
  global.fetch
    .mockReturnValueOnce(jsonResponse(clientsResponse()))
    .mockReturnValueOnce(jsonResponse({ data: client }));

  renderClientsView();
  fireEvent.click(await screen.findByRole('button', {
    name: 'Voir la fiche de Aminata Kouassi',
  }));

  expect(await screen.findByRole('heading', { name: 'Fiche client' })).toBeInTheDocument();
  expect(screen.getByText('CLI-AG-001')).toBeInTheDocument();
  expect(screen.getByText('Commerçante')).toBeInTheDocument();
  expect(screen.getByText('2', { selector: 'dd' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith(
    'http://localhost:8000/api/v1/clients/client-123',
    expect.any(Object),
  );
});

test('creates a client using only writable fields from the API contract', async () => {
  global.fetch
    .mockReturnValueOnce(jsonResponse(clientsResponse()))
    .mockReturnValueOnce(jsonResponse({ data: client }, 201))
    .mockReturnValueOnce(jsonResponse(clientsResponse()))
    .mockReturnValueOnce(jsonResponse({ data: client }));

  renderClientsView();
  fireEvent.click(await screen.findByRole('button', { name: 'Nouveau client' }));

  fireEvent.change(screen.getByLabelText('Prénom'), {
    target: { value: 'Aminata' },
  });
  fireEvent.change(screen.getByLabelText('Nom'), {
    target: { value: 'Kouassi' },
  });
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
    target: { value: 'aminata.client@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Téléphone'), {
    target: { value: '0701000000' },
  });
  fireEvent.change(screen.getByLabelText('Ville'), {
    target: { value: 'Abidjan' },
  });
  fireEvent.change(screen.getByLabelText('Adresse'), {
    target: { value: 'Centre-ville' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Créer le client' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/clients',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nom_client: 'Kouassi',
          prenom_client: 'Aminata',
          adresse_client: 'Centre-ville',
          telephone_client: '0701000000',
          ville_client: 'Abidjan',
          email_client: 'aminata.client@example.test',
          date_naissance: null,
          lieu_naissance: null,
          sexe: null,
          profession: null,
        }),
      }),
    );
  });
  expect(await screen.findByRole('heading', { name: 'Fiche client' })).toBeInTheDocument();
});

test('updates client information and does not send system-controlled fields', async () => {
  const updatedClient = { ...client, nom_client: 'Nom modifié' };
  global.fetch
    .mockReturnValueOnce(jsonResponse(clientsResponse()))
    .mockReturnValueOnce(jsonResponse({ data: client }))
    .mockReturnValueOnce(jsonResponse({ data: updatedClient }))
    .mockReturnValueOnce(jsonResponse(clientsResponse([updatedClient])));

  renderClientsView();
  fireEvent.click(await screen.findByRole('button', {
    name: 'Voir la fiche de Aminata Kouassi',
  }));
  fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }));
  fireEvent.change(screen.getByLabelText('Nom'), {
    target: { value: 'Nom modifié' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/clients/client-123',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"nom_client":"Nom modifié"'),
      }),
    );
  });
  expect(await screen.findByText('Aminata Nom modifié')).toBeInTheDocument();
});

test('hides client create and detail actions when permissions are absent', async () => {
  renderClientsView([
    {
      id: 'clients.consulter_tout',
      identifiant: 'consulterTout',
      libelle: 'Consulter les clients',
      description: '',
      module: 'clients',
      module_libelle: 'Clients',
    },
  ]);

  expect(await screen.findByText('Aminata Kouassi')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nouveau client' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {
    name: 'Voir la fiche de Aminata Kouassi',
  })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {
    name: 'Modifier Aminata Kouassi',
  })).not.toBeInTheDocument();
});

test('shows backend authorization errors for the client list', async () => {
  global.fetch.mockReturnValueOnce(
    jsonResponse({ message: 'Accès refusé.' }, 403),
  );

  renderClientsView();

  expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé.');
});
