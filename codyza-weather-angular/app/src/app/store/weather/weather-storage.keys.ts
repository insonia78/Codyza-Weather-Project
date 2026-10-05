export const WEATHER_STORAGE_KEYS = {
  favorites: 'codyza-weather-favorites-v1',
  recentSearches: 'codyza-weather-recent-searches-v1',
  settings: 'codyza-weather-settings-v1',
  lastDashboard: 'codyza-weather-last-dashboard-v1',
  comparison: 'codyza-weather-comparison-v1'
} as const;

export const WEATHER_STORAGE_KEY_VALUES = Object.values(WEATHER_STORAGE_KEYS);
