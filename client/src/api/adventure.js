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
  resetQuest: () =>
    api.delete('/adventure/quest').then((r) => r.data),
  getPendingCards: () =>
    api.get('/adventure/cards/pending').then((r) => r.data),
  markCardsSeen: (cardIds) =>
    api.patch('/adventure/cards/seen', { cardIds }).then((r) => r.data),
  getLoot: () =>
    api.get('/adventure/loot').then((r) => r.data),
  getCampaignBadges: () =>
    api.get('/adventure/badges').then((r) => r.data),
  getWorld: () =>
    api.get('/adventure/world').then((r) => r.data),
};
