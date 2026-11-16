# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Configuration de l’API Laravel

L’application utilise par défaut `http://localhost:8000/api/v1`, conformément à
l’URL de développement du backend. Pour une autre adresse, définissez
`REACT_APP_API_URL` dans un fichier `.env.local` à la racine du frontend, puis
redémarrez le serveur React :

```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

Le formulaire d’authentification utilise les routes Laravel
`POST /auth/login`, `GET /auth/profile` et `POST /auth/logout`.

## Gestion des utilisateurs

L’accès à la liste est affiché uniquement lorsque la session dispose de la
permission `utilisateurs.consulter_tout`. Les actions de création, modification,
d’activation et de désactivation sont conditionnées aux permissions renvoyées par
`GET /auth/permissions`; Laravel reste responsable de l’autorisation effective.

Le module consomme les routes `GET/POST /users`, `PATCH /users/{uuid}`,
`PATCH /users/{uuid}/activer`, `PATCH /users/{uuid}/desactiver`,
`GET /users/{uuid}/permissions` et `GET /roles`. La recherche utilise les
paramètres backend `recherche`, `role`, `actif`, `page` et `per_page`.

L’API actuelle ne fournit ni route de suppression d’utilisateur, ni route pour
lister les agences. En conséquence, aucune suppression n’est proposée et le
formulaire de création d’un rôle rattaché à une agence demande l’`agence_id`
numérique existant, sans inventer de sélecteur ou d’endpoint.

## Tableau de bord

Le tableau de bord est affiché aux sessions disposant de la permission
`reportings.consulter_tout`. Les indicateurs utilisent
`GET /reportings/indicateurs` avec les paramètres de période `date_debut` et
`date_fin`; ils affichent les totaux et agrégats réellement fournis par Laravel.
La liste des six dernières opérations appelle `GET /transactions` uniquement
avec `transactions.consulter_tout`. Les données non disponibles par API, comme
une série historique mensuelle ou les détails nominatifs des dossiers en attente,
ne sont pas simulées.

## Gestion des clients

La liste utilise `GET /clients` avec `recherche`, `statut`, `page` et
`per_page`. La fiche client utilise `GET /clients/{uuid}`; la création et la
modification utilisent respectivement `POST /clients` et `PATCH /clients/{uuid}`.
Les actions sont présentées selon les permissions `clients.consulter_tout`,
`clients.consulter`, `clients.creer` et `clients.modifier`, tandis que Laravel
applique aussi ses contrôles d’accès et le périmètre d’agence.

L’API ne fournit pas de suppression ni de routes de blocage/déblocage des clients.
Les pièces d’identité et les revenus ne sont pas inclus dans la ressource client;
ils ne sont donc pas exposés par l’interface. La gestion des comptes associés
reste réservée au module Comptes.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
