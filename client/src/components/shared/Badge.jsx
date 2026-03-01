import { WORKOUT_TYPE_COLORS } from '../../utils/constants';
import { formatWorkoutType } from '../../utils/formatters';

export default function Badge({ type }) {
  const colorClass = WORKOUT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {formatWorkoutType(type)}
    </span>
  );
}
