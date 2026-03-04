import api from './axiosInstance';

export const adventureApi = {
  updateCharacter: ({ archetype, gender, color }) =>
    api.patch('/adventure/character', { archetype, gender, color }).then((r) => r.data.user),
  toggleMode: (enabled) =>
    api.patch('/adventure/mode', { enabled }).then((r) => r.data.user),
  getQuest: () =>
    api.get('/adventure/quest').then((r) => r.data),
  setDifficulty: (difficulty) =>
    api.patch('/adventure/difficulty', { difficulty }).then((r) => r.data),
};
