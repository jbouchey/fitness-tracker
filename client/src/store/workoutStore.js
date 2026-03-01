import { create } from 'zustand';
import { workoutsApi } from '../api/workouts';

export const useWorkoutStore = create((set, get) => ({
  workouts: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  stats: { totalWorkouts: 0, totalMiles: 0, totalElevationGain: 0 },
  filters: {
    search: '',
    type: '',
    startDate: '',
    endDate: '',
    sortBy: 'startTime',
    sortDir: 'desc',
  },
  isLoading: false,
  error: null,
  personalRecords: null,

  setFilters(newFilters) {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // reset to first page on filter change
    }));
    get().fetchWorkouts();
  },

  setPage(page) {
    set((state) => ({ pagination: { ...state.pagination, page } }));
    get().fetchWorkouts();
  },

  async fetchWorkouts() {
    const { filters, pagination } = get();
    set({ isLoading: true, error: null });
    try {
      const result = await workoutsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      set({
        workouts: result.workouts,
        pagination: result.pagination,
        stats: result.stats,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.error || 'Failed to load workouts.' });
    }
  },

  async fetchPersonalRecords() {
    try {
      const { records } = await workoutsApi.getPersonalRecords();
      set({ personalRecords: records });
    } catch {
      // Non-critical, silently fail
    }
  },

  removeWorkout(id) {
    set((state) => ({
      workouts: state.workouts.filter((w) => w.id !== id),
      pagination: { ...state.pagination, total: state.pagination.total - 1 },
    }));
  },
}));
