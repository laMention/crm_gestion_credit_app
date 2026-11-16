import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import { hasAuthToken } from '../core/utils/authStorage';
import * as authService from '../services/authService';

export default function useAuthViewModel() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initializationError, setInitializationError] = useState('');
  const [error, setError] = useState('');

  const restoreSession = useCallback(async () => {
    setIsInitializing(true);
    setInitializationError('');

    if (!hasAuthToken()) {
      setUser(null);
      setPermissions([]);
      setIsInitializing(false);
      return;
    }

    try {
      const [profile, currentPermissions] = await Promise.all([
        authService.getProfile(),
        authService.getCurrentPermissions(),
      ]);
      setUser(profile);
      setPermissions(currentPermissions);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      if (requestError.status === 401) {
        authService.clearSession();
        setUser(null);
        setPermissions([]);
      } else {
        setInitializationError(requestError.message);
      }
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!isMounted) {
        return;
      }

      await restoreSession();
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [restoreSession]);

  const signIn = async (credentials, remember) => {
    setIsSubmitting(true);
    setError('');

    try {
      const authenticatedUser = await authService.login(credentials, remember);
      const currentPermissions = await authService.getCurrentPermissions();
      setUser(authenticatedUser);
      setPermissions(currentPermissions);
      return true;
    } catch (requestError) {
      authService.clearSession();
      setUser(null);
      setPermissions([]);

      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setError(requestError.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await authService.logout();
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setError(
        `La session locale a été fermée, mais le serveur n’a pas confirmé la révocation du jeton : ${requestError.message}`,
      );
    } finally {
      setUser(null);
      setPermissions([]);
      setIsLoggingOut(false);
    }
  };

  return {
    user,
    permissions,
    isInitializing,
    isSubmitting,
    isLoggingOut,
    initializationError,
    error,
    login: signIn,
    logout: signOut,
    retrySession: restoreSession,
  };
}
