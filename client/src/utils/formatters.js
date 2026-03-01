/**
 * Format seconds-per-mile pace as "MM:SS /mi"
 */
export function formatPace(secPerMile) {
  if (!secPerMile || secPerMile <= 0) return '--';
  const mins = Math.floor(secPerMile / 60);
  const secs = Math.round(secPerMile % 60).toString().padStart(2, '0');
  return `${mins}:${secs} /mi`;
}

/**
 * Format total seconds as "H:MM:SS" or "MM:SS"
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60).toString().padStart(2, '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

/**
 * Format miles to 2 decimal places
 */
export function formatDistance(miles) {
  if (miles == null) return '--';
  return `${Number(miles).toFixed(2)} mi`;
}

/**
 * Format feet with commas: "1,234 ft"
 */
export function formatElevation(feet) {
  if (feet == null) return '--';
  return `${Math.round(feet).toLocaleString()} ft`;
}

/**
 * Format BPM
 */
export function formatHeartRate(bpm) {
  if (bpm == null) return '--';
  return `${Math.round(bpm)} bpm`;
}

/**
 * Format a Date object as "Jun 15, 2025"
 */
export function formatDate(date) {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a Date object as "7:32 AM"
 */
export function formatTime(date) {
  if (!date) return '--';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Human-readable workout type label
 */
export function formatWorkoutType(type) {
  const labels = {
    TRAIL_RUN: 'Trail Run',
    ROAD_RUN: 'Road Run',
    HIKE: 'Hike',
    CYCLING: 'Cycling',
    STRENGTH: 'Strength',
    OTHER: 'Other',
  };
  return labels[type] || type;
}
