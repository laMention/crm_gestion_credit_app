import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as userService from '../services/userService';

const INITIAL_FILTERS = {
  search: '',
  role: '',
  status: '',
};

export default function useUsersViewModel() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [rolesError, setRolesError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setUsersError('');

    try {
      const result = await userService.listUsers({ ...filters, page });
      setUsers(result.users);
      setMeta(result.meta);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setUsersError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  const loadRoles = useCallback(async () => {
    setIsLoadingRoles(true);

    try {
      const availableRoles = await userService.listRoles();
      setRoles(availableRoles);
      setRolesError('');
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setRolesError(requestError.message);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  const retry = () => {
    void loadUsers();
    void loadRoles();
  };

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setNotice('');
    setActionError('');
  };

  const saveUser = async ({ uuid, payload }) => {
    setIsSaving(true);
    setActionError('');
    setNotice('');

    try {
      if (uuid) {
        await userService.updateUser(uuid, payload);
        setNotice('Les informations de l’utilisateur ont été mises à jour.');
      } else {
        await userService.createUser(payload);
        setNotice('L’utilisateur a été créé.');
      }

      await loadUsers();
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setActionError(requestError.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const changeActiveState = async (targetUser) => {
    setActionError('');
    setNotice('');

    try {
      await userService.setUserActive(targetUser.uuid, !targetUser.actif);
      setNotice(
        targetUser.actif
          ? 'L’utilisateur a été désactivé.'
          : 'L’utilisateur a été activé.',
      );
      await loadUsers();
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setActionError(requestError.message);
    }
  };

  const getPermissions = async (targetUser) => {
    return userService.getUserPermissions(targetUser.uuid);
  };

  const error = usersError || rolesError || actionError;

  return {
    users,
    roles,
    meta,
    filters,
    page,
    isLoading,
    isSaving,
    isLoadingRoles,
    error,
    actionError,
    notice,
    applyFilters,
    setPage,
    loadUsers,
    retry,
    saveUser,
    changeActiveState,
    getPermissions,
  };
}
