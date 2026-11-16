import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as installmentService from '../services/installmentService';

const INITIAL_META = { currentPage: 1, lastPage: 1, total: 0, perPage: 10 };
const INITIAL_FILTERS = {
  clientUuid: '',
  creditUuid: '',
  status: '',
  unpaidOnly: false,
  overdueOnly: false,
  startDate: '',
  endDate: '',
};

export default function useInstallmentsViewModel() {
  const [installments, setInstallments] = useState([]);
  const [meta, setMeta] = useState(INITIAL_META);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadInstallments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await installmentService.listInstallments({ ...filters, page });
      setInstallments(result.installments);
      setMeta(result.meta);
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadInstallments();
  }, [loadInstallments, reloadKey]);

  useEffect(() => {
    if (!selectedUuid) {
      setSelectedInstallment(null);
      setDetailError('');
      setIsLoadingDetail(false);
      return undefined;
    }

    let isCurrent = true;
    setSelectedInstallment(null);
    setDetailError('');
    setIsLoadingDetail(true);

    async function loadDetail() {
      try {
        const installment = await installmentService.getCreditInstallment(selectedUuid);
        if (isCurrent) setSelectedInstallment(installment);
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) throw requestError;
        if (isCurrent) setDetailError(requestError.message);
      } finally {
        if (isCurrent) setIsLoadingDetail(false);
      }
    }
    void loadDetail();
    return () => { isCurrent = false; };
  }, [selectedUuid, detailReloadKey]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const showInstallment = (uuid) => setSelectedUuid(uuid);
  const backToList = () => {
    setSelectedUuid('');
    setSelectedInstallment(null);
    setDetailError('');
  };
  const retry = () => {
    if (selectedUuid) setDetailReloadKey((key) => key + 1);
    else setReloadKey((key) => key + 1);
  };

  return {
    installments,
    meta,
    filters,
    page,
    selectedUuid,
    selectedInstallment,
    isLoading,
    isLoadingDetail,
    error,
    detailError,
    applyFilters,
    setPage,
    showInstallment,
    backToList,
    retry,
  };
}
