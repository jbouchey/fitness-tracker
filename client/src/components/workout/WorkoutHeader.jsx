import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../shared/Badge';
import { workoutsApi } from '../../api/workouts';
import { formatDate, formatTime } from '../../utils/formatters';

export default function WorkoutHeader({ workout, onUpdate }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(workout.title);
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [deleting, setDeleting] = useState(false);

  async function handleTitleSave() {
    if (title === workout.title) { setEditing(false); return; }
    try {
      const { workout: updated } = await workoutsApi.update(workout.id, { title });
      onUpdate(updated);
      setEditing(false);
    } catch {
      setTitle(workout.title);
      setEditing(false);
    }
  }

  async function handleNotesSave() {
    if (notes === (workout.notes ?? '')) return;
    try {
      const { workout: updated } = await workoutsApi.update(workout.id, { notes });
      onUpdate(updated);
    } catch {
      setNotes(workout.notes ?? '');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await workoutsApi.delete(workout.id);
      navigate('/');
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitle(workout.title); setEditing(false); } }}
              className="text-2xl font-bold w-full border-b-2 border-brand-400 outline-none bg-transparent"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-gray-900 cursor-text hover:text-brand-700 transition-colors"
              onClick={() => setEditing(true)}
              title="Click to edit"
            >
              {workout.title}
            </h1>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Badge type={workout.workoutType} />
            <span className="text-sm text-gray-500">
              {formatDate(workout.startTime)} at {formatTime(workout.startTime)}
            </span>
            <span className="text-xs text-gray-400">{workout.fileFormat}</span>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-danger flex-shrink-0"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleNotesSave}
        placeholder="Add notes…"
        rows={3}
        className="mt-3 w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-brand-400 placeholder-gray-400"
      />
    </div>
  );
}
