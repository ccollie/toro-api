import type { JobFilter } from '@/types';
import { useJobFilterStore } from '@/stores/job-filters';
import { useCallback, useMemo } from 'react';
import shallow from 'zustand/shallow';

export function useQueueJobFilters(queueId: string) {

  const [
    _allFilters,
    _getFilters,
    _createFilter,
    _updateFilter,
    _deleteFilter,
    _getHistory,
    _addToHistory,
    _removeFromHistory
  ] = useJobFilterStore(state => [
    state.filters,
    state.getFilters,
    state.createFilter,
    state.updateFilter,
    state.deleteFilter,
    state.getQueueHistory,
    state.addFilterToHistory,
    state.removeFromHistory
  ], shallow);

  const history = useMemo(() => _getHistory(queueId), [queueId]);
  const filters = useMemo(() => _allFilters[queueId] ?? [], [queueId]);

  const addToHistory = useCallback((filter: string | JobFilter): JobFilter => {
    return _addToHistory(queueId, filter);
  }, [queueId]);

  const removeFromHistory = useCallback((id: string): boolean => {
    return _removeFromHistory(queueId, id);
  }, [queueId]);

  const createFilter = useCallback((name: string, expression: string): Promise<JobFilter> =>
  {
    return _createFilter(queueId, name, expression);
  }, [queueId]);

  const getFilters = useCallback((ids?: string[]): Promise<JobFilter[]> => {
    return _getFilters(queueId, ids);
  }, [queueId]);

  const getFilterById = async (id: string): Promise<JobFilter | undefined> => {
    const filters = await getFilters([id]);
    return filters.length ? filters[0] : undefined;
  };

  const deleteFilter = useCallback(async (id: string): Promise<boolean> => {
    return _deleteFilter(queueId, id);
  }, [queueId]);

  const updateFilter = useCallback((filter: JobFilter): Promise<void> => {
    return _updateFilter(queueId, filter.id, filter);
  }, [queueId]);

  return {
    removeFromHistory,
    addToHistory,
    createFilter,
    updateFilter,
    getFilterById,
    deleteFilter,
    getFilters,
    history,
    filters
  };
}
