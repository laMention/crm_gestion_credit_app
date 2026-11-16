import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as dashboardService from '../services/dashboardService';

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function currentMonthPeriod() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    dateStart: toLocalDateString(firstDay),
    dateEnd: toLocalDateString(today),
  };
}

export default function useDashboardViewModel(canViewTransactions) {
  const [period, setPeriod] = useState(currentMonthPeriod);
  const [draftPeriod, setDraftPeriod] = useState(currentMonthPeriod);
  const [indicators, setIndicators] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(
    canViewTransactions,
  );
  const [indicatorsError, setIndicatorsError] = useState('');
  const [transactionsError, setTransactionsError] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadIndicators() {
      setIndicators(null);
      setIndicatorsError('');
      setIsLoadingIndicators(true);

      try {
        const result = await dashboardService.getDashboardIndicators(period);
        if (isCurrent) {
          setIndicators(result);
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) {
          throw requestError;
        }

        if (isCurrent) {
          setIndicatorsError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingIndicators(false);
        }
      }
    }

    async function loadTransactions() {
      if (!canViewTransactions) {
        setTransactions([]);
        setTransactionsError('');
        setIsLoadingTransactions(false);
        return;
      }

      setTransactions([]);
      setTransactionsError('');
      setIsLoadingTransactions(true);

      try {
        const result = await dashboardService.listRecentTransactions(period);
        if (isCurrent) {
          setTransactions(result);
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) {
          throw requestError;
        }

        if (isCurrent) {
          setTransactionsError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingTransactions(false);
        }
      }
    }

    void loadIndicators();
    void loadTransactions();

    return () => {
      isCurrent = false;
    };
  }, [canViewTransactions, period, reloadKey]);

  const applyPeriod = useCallback(() => {
    if (!draftPeriod.dateStart || !draftPeriod.dateEnd) {
      setPeriodError('Renseignez les deux dates de la période.');
      return false;
    }

    if (draftPeriod.dateStart > draftPeriod.dateEnd) {
      setPeriodError('La date de début doit précéder la date de fin.');
      return false;
    }

    setPeriodError('');
    setPeriod(draftPeriod);
    return true;
  }, [draftPeriod]);

  const updateDraftPeriod = (field, value) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      [field]: value,
    }));
    setPeriodError('');
  };

  const retry = () => {
    setReloadKey((key) => key + 1);
  };

  return {
    period,
    draftPeriod,
    indicators,
    transactions,
    isLoadingIndicators,
    isLoadingTransactions,
    indicatorsError,
    transactionsError,
    periodError,
    updateDraftPeriod,
    applyPeriod,
    retry,
  };
}
