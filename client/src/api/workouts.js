import api from './axiosInstance';

export const workoutsApi = {
  getAll: (params) => api.get('/workouts', { params }).then((r) => r.data),
  getById: (id) => api.get(`/workouts/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/workouts/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/workouts/${id}`).then((r) => r.data),
  getPersonalRecords: () => api.get('/workouts/records').then((r) => r.data),
  getActivityTrends: (period) => api.get('/workouts/trends', { params: { period, utcOffset: new Date().getTimezoneOffset() } }).then((r) => r.data),
};
