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

test('revokes the token on the backend and clears the local session on logout', async () => {
  window.localStorage.setItem('crm.auth.token', 'existing-token');
  global.fetch
    .mockReturnValueOnce(jsonResponse({ data: authenticatedUser }))
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
