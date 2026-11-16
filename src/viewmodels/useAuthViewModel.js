import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import { hasAuthToken } from '../core/utils/authStorage';
import * as authService from '../services/authService';

export default function useAuthViewModel() {
  const [user, setUser] = useState(null);
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
      setIsInitializing(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      if (requestError.status === 401) {
        authService.clearSession();
        setUser(null);
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
      setUser(authenticatedUser);
      return true;
    } catch (requestError) {
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
      setIsLoggingOut(false);
    }
  };

  return {
    user,
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
