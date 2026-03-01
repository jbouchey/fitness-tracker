import api from './axiosInstance';

export const uploadsApi = {
  upload: (file, { workoutType, title } = {}, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (workoutType) formData.append('workoutType', workoutType);
    if (title) formData.append('title', title);

    return api
      .post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },
};
