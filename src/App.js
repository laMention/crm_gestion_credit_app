import './App.css';
import useAuthViewModel from './viewmodels/useAuthViewModel';
import ProtectedRoute from './views/auth/ProtectedRoute';
import AuthenticatedView from './views/auth/AuthenticatedView';

function App() {
  const auth = useAuthViewModel();

  return (
    <ProtectedRoute auth={auth}>
      <AuthenticatedView
        user={auth.user}
        permissions={auth.permissions}
        error={auth.error}
        isLoggingOut={auth.isLoggingOut}
        onLogout={auth.logout}
      />
    </ProtectedRoute>
  );
}

export default App;
