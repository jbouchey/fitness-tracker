import api from './axiosInstance';

export const stravaApi = {
  getConnectUrl: () => api.get('/strava/connect').then((r) => r.data.url),
  getStatus: () => api.get('/strava/status').then((r) => r.data),
  disconnect: () => api.delete('/strava/disconnect').then((r) => r.data),
};
