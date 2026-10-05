import { ComparisonSnapshot, WeatherLocation } from '../../../models/weather.models';

export interface WeatherSavedState {
  favorites: WeatherLocation[];
  recentSearches: WeatherLocation[];
  comparisonSnapshots: ComparisonSnapshot[];
}

export const initialWeatherSavedState: WeatherSavedState = {
  favorites: [],
  recentSearches: [],
  comparisonSnapshots: []
};
