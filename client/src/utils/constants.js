export const WORKOUT_TYPES = [
  { value: 'TRAIL_RUN', label: 'Trail Run' },
  { value: 'ROAD_RUN', label: 'Road Run' },
  { value: 'HIKE', label: 'Hike' },
  { value: 'CYCLING', label: 'Cycling' },
  { value: 'STRENGTH', label: 'Strength' },
  { value: 'OTHER', label: 'Other' },
];

export const WORKOUT_TYPE_COLORS = {
  TRAIL_RUN: 'bg-green-100 text-green-800',
  ROAD_RUN:  'bg-blue-100 text-blue-800',
  HIKE:      'bg-yellow-100 text-yellow-800',
  CYCLING:   'bg-purple-100 text-purple-800',
  STRENGTH:  'bg-red-100 text-red-800',
  OTHER:     'bg-gray-100 text-gray-800',
};

export const SORT_OPTIONS = [
  { value: 'startTime', label: 'Date' },
  { value: 'distanceMiles', label: 'Distance' },
  { value: 'elapsedSeconds', label: 'Duration' },
  { value: 'elevationGainFt', label: 'Elevation Gain' },
  { value: 'avgHeartRate', label: 'Heart Rate' },
];

// Downsample track points to N for chart rendering performance
export const CHART_MAX_POINTS = 10;
