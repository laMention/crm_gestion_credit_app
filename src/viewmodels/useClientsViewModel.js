import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as clientService from '../services/clientService';

const INITIAL_FILTERS = {
  search: '',
  status: '',
};

export default function useClientsViewModel() {
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedClientUuid, setSelectedClientUuid] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await clientService.listClients({ ...filters, page });
      setClients(result.clients);
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
    void loadClients();
  }, [loadClients, reloadKey]);

  useEffect(() => {
    if (!selectedClientUuid) {
      setSelectedClient(null);
      setDetailError('');
      setIsLoadingDetail(false);
      return undefined;
    }

    let isCurrent = true;
    setSelectedClient(null);
    setDetailError('');
    setIsLoadingDetail(true);

    async function loadClient() {
      try {
        const client = await clientService.getClient(selectedClientUuid);
        if (isCurrent) {
          setSelectedClient(client);
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) {
          throw requestError;
        }

        if (isCurrent) {
          setDetailError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadClient();

    return () => {
      isCurrent = false;
    };
  }, [selectedClientUuid, detailReloadKey]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setNotice('');
    setActionError('');
  };

  const showClient = (uuid) => {
    setSelectedClientUuid(uuid);
    setNotice('');
    setActionError('');
  };

  const backToList = () => {
    setSelectedClientUuid('');
    setSelectedClient(null);
    setDetailError('');
    setActionError('');
  };

  const saveClient = async ({ uuid, payload }) => {
    setIsSaving(true);
    setActionError('');
    setNotice('');

    try {
      const client = uuid
        ? await clientService.updateClient(uuid, payload)
        : await clientService.createClient(payload);

      setSelectedClient(client);
      setSelectedClientUuid(client.uuid);
      setNotice(
        uuid
          ? 'Les informations du client ont été mises à jour.'
          : 'Le client a été créé.',
      );
      await loadClients();
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
    if (selectedClientUuid) {
      setDetailReloadKey((key) => key + 1);
    } else {
      setReloadKey((key) => key + 1);
    }
  };

  return {
    clients,
    meta,
    filters,
    page,
    selectedClientUuid,
    selectedClient,
    isLoading,
    isLoadingDetail,
    isSaving,
    error,
    detailError,
    actionError,
    notice,
    applyFilters,
    setPage,
    showClient,
    backToList,
    saveClient,
    retry,
  };
}
