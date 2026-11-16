import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as agencyService from '../services/agencyService';

const INITIAL_FILTERS = {
  search: '',
  status: '',
};

export default function useAgenciesViewModel() {
  const [agencies, setAgencies] = useState([]);
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
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadAgencies = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await agencyService.listAgencies({ ...filters, page });
      setAgencies(result.agencies);
      setMeta(result.meta);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }

      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadAgencies();
  }, [loadAgencies, reloadKey]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setNotice('');
    setActionError('');
  };

  const saveAgency = async ({ uuid, payload }) => {
    setIsSaving(true);
    setActionError('');
    setNotice('');

    try {
      if (uuid) {
        await agencyService.updateAgency(uuid, payload);
        setNotice('Les informations de l’agence ont été mises à jour.');
      } else {
        await agencyService.createAgency(payload);
        setNotice('L’agence a été créée.');
      }

      await loadAgencies();
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

  const retry = () => {
    setReloadKey((key) => key + 1);
  };

  return {
    agencies,
    meta,
    filters,
    page,
    isLoading,
    isSaving,
    error: error || actionError,
    actionError,
    notice,
    applyFilters,
    setPage,
    saveAgency,
    retry,
  };
}
