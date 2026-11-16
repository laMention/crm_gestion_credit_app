import { useCallback, useEffect, useState } from 'react';
import ApiError from '../core/api/ApiError';
import * as creditService from '../services/creditService';
import * as installmentService from '../services/installmentService';

const INITIAL_META = { currentPage: 1, lastPage: 1, total: 0, perPage: 10 };
const INITIAL_TRACKING = {
  inStudy: 0,
  awaitingApproval: 0,
  approved: 0,
  disbursed: 0,
  settled: 0,
  overdue: 0,
  overdueMoreThan30Days: 0,
  disbursedAmount: '0.00',
  remainingPrincipal: '0.00',
  unpaidInstallments: '0.00',
};

export default function useCreditsViewModel() {
  const [credits, setCredits] = useState([]);
  const [meta, setMeta] = useState(INITIAL_META);
  const [tracking, setTracking] = useState(INITIAL_TRACKING);
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCreditUuid, setSelectedCreditUuid] = useState('');
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [installmentTotal, setInstallmentTotal] = useState(0);
  const [repayments, setRepayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [error, setError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  const loadCredits = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setTrackingError('');
    const [creditsResult, trackingResult] = await Promise.allSettled([
      creditService.listCredits({ status, startDate, endDate, page }),
      creditService.getCreditTracking(),
    ]);
    if (creditsResult.status === 'fulfilled') {
      setCredits(creditsResult.value.credits);
      setMeta(creditsResult.value.meta);
    } else if (creditsResult.reason instanceof ApiError) {
      setError(creditsResult.reason.message);
    } else {
      setIsLoading(false);
      throw creditsResult.reason;
    }
    if (trackingResult.status === 'fulfilled') {
      setTracking(trackingResult.value);
    } else if (trackingResult.reason instanceof ApiError) {
      setTrackingError(trackingResult.reason.message);
    } else {
      setIsLoading(false);
      throw trackingResult.reason;
    }
    setIsLoading(false);
  }, [status, startDate, endDate, page]);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits, reloadKey]);

  useEffect(() => {
    if (!selectedCreditUuid) {
      setSelectedCredit(null);
      setInstallments([]);
      setInstallmentTotal(0);
      setRepayments([]);
      setDetailError('');
      setIsLoadingDetail(false);
      return undefined;
    }
    let isCurrent = true;
    setSelectedCredit(null);
    setInstallments([]);
    setRepayments([]);
    setDetailError('');
    setIsLoadingDetail(true);

    async function loadDetail() {
      try {
        const [credit, schedule, paymentHistory] = await Promise.all([
          creditService.getCredit(selectedCreditUuid),
          installmentService.listCreditInstallments(selectedCreditUuid),
          creditService.listCreditRepayments(selectedCreditUuid),
        ]);
        if (isCurrent) {
          setSelectedCredit(credit);
          setInstallments(schedule.installments);
          setInstallmentTotal(schedule.total);
          setRepayments(paymentHistory);
        }
      } catch (requestError) {
        if (!(requestError instanceof ApiError)) throw requestError;
        if (isCurrent) setDetailError(requestError.message);
      } finally {
        if (isCurrent) setIsLoadingDetail(false);
      }
    }
    void loadDetail();
    return () => { isCurrent = false; };
  }, [selectedCreditUuid, detailReloadKey]);

  const applyFilters = (nextFilters) => {
    setStatus(nextFilters.status);
    setStartDate(nextFilters.startDate);
    setEndDate(nextFilters.endDate);
    setPage(1);
    setNotice('');
  };

  const showCredit = (uuid) => {
    setSelectedCreditUuid(uuid);
  };

  const backToList = () => {
    setSelectedCreditUuid('');
    setSelectedCredit(null);
    setInstallments([]);
    setDetailError('');
  };

  const saveCredit = async ({ uuid, accountUuid, payload }) => {
    setIsSaving(true);
    setActionError('');
    setNotice('');
    try {
      const credit = uuid
        ? await creditService.updateCredit(uuid, payload)
        : await creditService.createCredit(accountUuid, payload);
      setNotice(uuid ? 'La demande de crédit a été mise à jour.' : 'La demande de crédit a été créée.');
      await loadCredits();
      if (uuid) {
        setDetailReloadKey((key) => key + 1);
      } else {
        showCredit(credit.uuid);
      }
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitCredit = async (uuid) => {
    setIsProcessingAction(true);
    setActionError('');
    setNotice('');
    try {
      await creditService.submitCredit(uuid);
      setNotice('La demande a été transmise au chef d’agence.');
      await loadCredits();
      setDetailReloadKey((key) => key + 1);
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const decideCredit = async ({ uuid, decision, approvedAmount, reason }) => {
    setIsProcessingAction(true);
    setActionError('');
    setNotice('');
    try {
      if (decision === 'approve') {
        await creditService.approveCredit(uuid, approvedAmount);
        setNotice('Le crédit a été approuvé et décaissé.');
      } else {
        await creditService.rejectCredit(uuid, reason);
        setNotice('La demande de crédit a été rejetée.');
      }
      await loadCredits();
      setDetailReloadKey((key) => key + 1);
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const makeRepayment = async (uuid, payload) => {
    setIsProcessingAction(true);
    setActionError('');
    setNotice('');
    try {
      const repayment = await creditService.repayCredit(uuid, payload);
      setNotice(`Remboursement enregistré · ${repayment.reference}.`);
      await loadCredits();
      setDetailReloadKey((key) => key + 1);
      return true;
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) throw requestError;
      setActionError(requestError.message);
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const retry = () => {
    if (selectedCreditUuid) setDetailReloadKey((key) => key + 1);
    else setReloadKey((key) => key + 1);
  };

  return {
    credits,
    meta,
    tracking,
    status,
    startDate,
    endDate,
    page,
    selectedCreditUuid,
    selectedCredit,
    installments,
    installmentTotal,
    repayments,
    isLoading,
    isLoadingDetail,
    isSaving,
    isProcessingAction,
    error,
    trackingError,
    detailError,
    actionError,
    notice,
    applyFilters,
    setPage,
    showCredit,
    backToList,
    saveCredit,
    submitCredit,
    decideCredit,
    makeRepayment,
    retry,
    clearActionError: () => setActionError(''),
    clearNotice: () => setNotice(''),
  };
}
