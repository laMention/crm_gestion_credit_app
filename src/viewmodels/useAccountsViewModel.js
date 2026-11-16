import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as accountService from '../services/accountService';

const INITIAL_FILTERS = { number: '', type: '', status: '' };

export default function useAccountsViewModel() {
  const [accounts, setAccounts] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedAccountUuid, setSelectedAccountUuid] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [statementError, setStatementError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await accountService.listAccounts({ ...filters, page });
      setAccounts(result.accounts);
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
    void loadAccounts();
  }, [loadAccounts, reloadKey]);

  useEffect(() => {
    if (!selectedAccountUuid) {
      setSelectedAccount(null);
      setDetailError('');
      setIsLoadingDetail(false);
      return undefined;
    }

    let isCurrent = true;
    setSelectedAccount(null);
    setDetailError('');
    setIsLoadingDetail(true);

    async function loadAccount() {
      try {
        const account = await accountService.getAccount(selectedAccountUuid);
        if (isCurrent) {
          setSelectedAccount(account);
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

    void loadAccount();
    return () => {
      isCurrent = false;
    };
  }, [selectedAccountUuid, detailReloadKey]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    setNotice('');
  };

  const showAccount = (uuid) => {
    setSelectedAccountUuid(uuid);
    setStatement(null);
    setStatementError('');
    setNotice('');
  };

  const backToList = () => {
    setSelectedAccountUuid('');
    setSelectedAccount(null);
    setStatement(null);
    setDetailError('');
    setStatementError('');
  };

  const createAccount = async ({ clientUuid, type }) => {
    setIsSaving(true);
    setActionError('');
    setNotice('');
    try {
      const account = await accountService.openAccount(clientUuid, type);
      setNotice('Le compte a été ouvert.');
      await loadAccounts();
      showAccount(account.uuid);
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

  const loadStatement = async ({ start, end, page: statementPage = 1 }) => {
    if (!selectedAccountUuid) {
      return false;
    }

    setIsLoadingStatement(true);
    setStatementError('');
    try {
      const result = await accountService.getAccountStatement(selectedAccountUuid, {
        start,
        end,
        page: statementPage,
      });
      setStatement(result);
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) {
        throw requestError;
      }
      setStatementError(requestError.message);
      return false;
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const retry = () => {
    if (selectedAccountUuid) {
      setDetailReloadKey((key) => key + 1);
    } else {
      setReloadKey((key) => key + 1);
    }
  };

  return {
    accounts,
    meta,
    filters,
    page,
    selectedAccountUuid,
    selectedAccount,
    statement,
    isLoading,
    isLoadingDetail,
    isLoadingStatement,
    isSaving,
    error,
    detailError,
    statementError,
    actionError,
    notice,
    applyFilters,
    setPage,
    showAccount,
    backToList,
    createAccount,
    loadStatement,
    retry,
    setActionError,
    setNotice,
  };
}
