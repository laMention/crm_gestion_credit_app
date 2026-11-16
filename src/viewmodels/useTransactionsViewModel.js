import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as transactionService from '../services/transactionService';

const INITIAL_FILTERS = {
  reference: '',
  accountNumber: '',
  type: '',
  status: '',
  startDate: '',
  endDate: '',
};

const INITIAL_META = { currentPage: 1, lastPage: 1, total: 0, perPage: 10 };

export default function useTransactionsViewModel({ canValidateWithdrawals }) {
  const [transactions, setTransactions] = useState([]);
  const [transactionMeta, setTransactionMeta] = useState(INITIAL_META);
  const [transactionPage, setTransactionPage] = useState(1);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [pendingMeta, setPendingMeta] = useState(INITIAL_META);
  const [pendingPage, setPendingPage] = useState(1);
  const [selectedTransactionUuid, setSelectedTransactionUuid] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingOperation, setIsSavingOperation] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [error, setError] = useState('');
  const [pendingError, setPendingError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingReloadKey, setPendingReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await transactionService.listTransactions({ ...filters, page: transactionPage });
      setTransactions(result.transactions);
      setTransactionMeta(result.meta);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, transactionPage]);

  const loadPendingWithdrawals = useCallback(async () => {
    if (!canValidateWithdrawals) return;
    setIsLoadingPending(true);
    setPendingError('');
    try {
      const result = await transactionService.listPendingWithdrawals(pendingPage);
      setPendingWithdrawals(result.transactions);
      setPendingMeta(result.meta);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setPendingError(requestError.message);
    } finally {
      setIsLoadingPending(false);
    }
  }, [canValidateWithdrawals, pendingPage]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, reloadKey]);

  useEffect(() => {
    void loadPendingWithdrawals();
  }, [loadPendingWithdrawals, pendingReloadKey]);

  useEffect(() => {
    if (!selectedTransactionUuid) {
      setSelectedTransaction(null);
      setDetailError('');
      setIsLoadingDetail(false);
      return undefined;
    }

    let isCurrent = true;
    setSelectedTransaction(null);
    setDetailError('');
    setIsLoadingDetail(true);

    async function loadTransaction() {
      try {
        const transaction = await transactionService.getTransaction(selectedTransactionUuid);
        if (isCurrent) setSelectedTransaction(transaction);
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) throw requestError;
        if (isCurrent) setDetailError(requestError.message);
      } finally {
        if (isCurrent) setIsLoadingDetail(false);
      }
    }

    void loadTransaction();
    return () => {
      isCurrent = false;
    };
  }, [selectedTransactionUuid, detailReloadKey]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setTransactionPage(1);
    setNotice('');
  };

  const showTransaction = (uuid) => {
    setSelectedTransactionUuid(uuid);
  };

  const closeTransaction = () => {
    setSelectedTransactionUuid('');
    setSelectedTransaction(null);
    setDetailError('');
  };

  const createOperation = async (operation) => {
    setIsSavingOperation(true);
    setActionError('');
    setNotice('');
    try {
      const transaction = await transactionService.createFinancialOperation(operation);
      setNotice(
        transaction.status === 'en_attente'
          ? `Le retrait ${transaction.reference} a été soumis à validation.`
          : `L’opération ${transaction.reference} a été effectuée.`,
      );
      await loadTransactions();
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsSavingOperation(false);
    }
  };

  const decideWithdrawal = async ({ uuid, decision, reason }) => {
    setIsProcessingDecision(true);
    setActionError('');
    setNotice('');
    try {
      if (decision === 'approve') {
        await transactionService.approveWithdrawal(uuid);
        setNotice('Le retrait a été approuvé et exécuté.');
      } else {
        await transactionService.rejectWithdrawal(uuid, reason);
        setNotice('Le retrait a été rejeté.');
      }
      await Promise.all([loadTransactions(), loadPendingWithdrawals()]);
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const retry = (tab = 'history') => {
    if (selectedTransactionUuid) {
      setDetailReloadKey((key) => key + 1);
    } else if (tab === 'pending') {
      setPendingReloadKey((key) => key + 1);
    } else {
      setReloadKey((key) => key + 1);
    }
  };

  return {
    transactions,
    transactionMeta,
    transactionPage,
    pendingWithdrawals,
    pendingMeta,
    pendingPage,
    selectedTransactionUuid,
    selectedTransaction,
    isLoading,
    isLoadingPending,
    isLoadingDetail,
    isSavingOperation,
    isProcessingDecision,
    error,
    pendingError,
    detailError,
    actionError,
    notice,
    applyFilters,
    setTransactionPage,
    setPendingPage,
    showTransaction,
    closeTransaction,
    createOperation,
    decideWithdrawal,
    retry,
    clearActionError: () => setActionError(''),
    clearNotice: () => setNotice(''),
  };
}
