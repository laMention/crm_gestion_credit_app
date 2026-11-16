import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgenciesView from './AgenciesView';

const agency = {
  id: 12,
  uuid: 'agency-123',
  code_agence: 'AG-TEST',
  nom_agence: 'Agence de test',
  adresse_agence: '12 rue du Plateau',
  ville_agence: 'Abidjan',
  telephone_agence: '0700000000',
  email_agence: 'agence@example.test',
  actif: true,
};

const readPermission = {
  id: 'agences.consulter_tout',
  identifiant: 'consulterTout',
  libelle: 'Consulter toutes les agences',
  description: '',
  module: 'agences',
  module_libelle: 'Agences',
};

const writePermissions = [
  readPermission,
  {
    id: 'agences.creer',
    identifiant: 'creer',
    libelle: 'Créer une agence',
    description: '',
    module: 'agences',
    module_libelle: 'Agences',
  },
  {
    id: 'agences.modifier',
    identifiant: 'modifier',
    libelle: 'Modifier une agence',
    description: '',
    module: 'agences',
    module_libelle: 'Agences',
  },
];

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

function agenciesResponse(items = [agency], currentPage = 1, lastPage = 1) {
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

function renderAgenciesView(permissions = writePermissions) {
  return render(<AgenciesView permissions={permissions} />);
}

beforeEach(() => {
  global.fetch = jest.fn((url, options = {}) => {
    if (url.includes('/agences?')) {
      return jsonResponse(agenciesResponse());
    }

    if (url.endsWith('/agences') && options.method === 'POST') {
      return jsonResponse({ data: agency }, 201);
    }

    if (url.endsWith('/agences/agency-123') && options.method === 'PATCH') {
      return jsonResponse({ data: { ...agency, actif: false } });
    }

    return jsonResponse({ data: agency });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('lists agencies with the server filters and status', async () => {
  renderAgenciesView();

  expect(await screen.findByText('Agence de test')).toBeInTheDocument();
  expect(screen.getByText('AG-TEST')).toBeInTheDocument();
  expect(screen.getByText('Active')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher une agence' }), {
    target: { value: 'Plateau' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par statut' }), {
    target: { value: '0' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/agences?per_page=10&page=1&recherche=Plateau&actif=0',
      expect.any(Object),
    );
  });
});

test('creates an agency with the Laravel request fields', async () => {
  renderAgenciesView();
  await screen.findByText('Agence de test');
  fireEvent.click(screen.getByRole('button', { name: 'Nouvelle agence' }));

  fireEvent.change(screen.getByLabelText('Code agence'), {
    target: { value: 'AG-NOUV' },
  });
  fireEvent.change(screen.getByLabelText('Nom de l’agence'), {
    target: { value: 'Agence Nouvelle' },
  });
  fireEvent.change(screen.getByLabelText('Adresse'), {
    target: { value: '25 rue Centrale' },
  });
  fireEvent.change(screen.getByLabelText('Ville'), {
    target: { value: 'Abidjan' },
  });
  fireEvent.change(screen.getByLabelText('Téléphone'), {
    target: { value: '0701234567' },
  });
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
    target: { value: 'nouvelle@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/agences',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code_agence: 'AG-NOUV',
          nom_agence: 'Agence Nouvelle',
          adresse_agence: '25 rue Centrale',
          ville_agence: 'Abidjan',
          telephone_agence: '0701234567',
          email_agence: 'nouvelle@example.test',
        }),
      }),
    );
  });

  expect(await screen.findByRole('status')).toHaveTextContent('L’agence a été créée.');
});

test('updates agency details and status', async () => {
  renderAgenciesView();
  await screen.findByText('Agence de test');
  fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Agence active' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/agences/agency-123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          code_agence: 'AG-TEST',
          nom_agence: 'Agence de test',
          adresse_agence: '12 rue du Plateau',
          ville_agence: 'Abidjan',
          telephone_agence: '0700000000',
          email_agence: 'agence@example.test',
          actif: false,
        }),
      }),
    );
  });

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Les informations de l’agence ont été mises à jour.',
  );
});

test('hides agency write actions when the user has read-only access', async () => {
  renderAgenciesView([readPermission]);

  expect(await screen.findByText('Agence de test')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nouvelle agence' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
});
