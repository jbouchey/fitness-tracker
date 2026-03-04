/**
 * Fetches historical weather from Open-Meteo archive API.
 * Free, no API key required.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Date}   date - Date/time of the workout
 * @returns {{ weatherCode: number, temperatureC: number }}
 */
async function getHistoricalWeather(lat, lng, date) {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const hour = date.getUTCHours();

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${dateStr}&end_date=${dateStr}` +
    `&hourly=weathercode,temperature_2m`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const data = await res.json();
  const idx = Math.min(hour, (data.hourly?.weathercode?.length ?? 1) - 1);

  return {
    weatherCode: data.hourly.weathercode[idx] ?? 0,
    temperatureC: data.hourly.temperature_2m[idx] ?? null,
  };
}

module.exports = { getHistoricalWeather };
