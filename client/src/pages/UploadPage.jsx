import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadsApi } from '../api/uploads';
import { WORKOUT_TYPES } from '../utils/constants';
import ErrorBanner from '../components/shared/ErrorBanner';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [workoutType, setWorkoutType] = useState('TRAIL_RUN');
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      setError('Only .fit, .gpx, and .tcx files are accepted (max 50 MB).');
      return;
    }
    setFile(accepted[0]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.fit'], 'application/gpx+xml': ['.gpx'], 'text/xml': ['.gpx', '.tcx'], 'application/vnd.garmin.tcx+xml': ['.tcx'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const { workout } = await uploadsApi.upload(file, { workoutType, title }, setProgress);
      navigate(`/workouts/${workout.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Workout</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <svg className="h-10 w-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 font-medium">
                {isDragActive ? 'Drop it here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports .fit, .gpx, and .tcx files up to 50 MB</p>
            </div>
          )}
        </div>

        {/* Workout type */}
        <div>
          <label className="form-label" htmlFor="workoutType">Workout type</label>
          <select
            id="workoutType"
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value)}
            className="form-input"
          >
            {WORKOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Optional title */}
        <div>
          <label className="form-label" htmlFor="title">Title (optional)</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Morning Trail Run"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading & parsing…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="btn-primary w-full"
        >
          {uploading ? 'Processing…' : 'Upload Workout'}
        </button>
      </div>
    </div>
  );
}
