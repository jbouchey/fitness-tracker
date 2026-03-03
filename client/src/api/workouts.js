import api from './axiosInstance';

export const workoutsApi = {
  getAll: (params) => {
    const { types, ...rest } = params;
    const p = { ...rest };
    if (types?.length) p.types = types.join(',');
    return api.get('/workouts', { params: p }).then((r) => r.data);
  },
  getById: (id) => api.get(`/workouts/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/workouts/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/workouts/${id}`).then((r) => r.data),
  getPersonalRecords: () => api.get('/workouts/records').then((r) => r.data),
  getActivityTrends: (period, types = null) => {
    const params = { period, utcOffset: new Date().getTimezoneOffset() };
    if (types?.length) params.types = types.join(',');
    return api.get('/workouts/trends', { params }).then((r) => r.data);
  },
};
