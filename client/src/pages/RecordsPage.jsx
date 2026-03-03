import { useEffect } from 'react';
import { useWorkoutStore } from '../store/workoutStore';
import PersonalRecords from '../components/dashboard/PersonalRecords';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function RecordsPage() {
  const { personalRecords, fetchPersonalRecords } = useWorkoutStore();

  useEffect(() => {
    fetchPersonalRecords();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Records</h1>
      </div>

      {!personalRecords ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <PersonalRecords records={personalRecords} />
      )}
    </div>
  );
}
