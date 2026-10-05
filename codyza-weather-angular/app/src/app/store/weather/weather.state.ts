import {
  ChartSeries,
  ComparisonSnapshot,
  MapLayerKey,
  MeasurementSystem,
  TemperatureUnit,
  WeatherDashboard,
  WeatherLocation
} from '../../models/weather.models';
import { initialWeatherDashboardState, WeatherDashboardState } from './state/weather-dashboard.state';
import { initialWeatherMapState, WeatherMapState } from './state/weather-map.state';
import { initialWeatherPreferencesState, WeatherPreferencesState } from './state/weather-preferences.state';
import { initialWeatherSavedState, WeatherSavedState } from './state/weather-saved.state';
import { initialWeatherSearchState, WeatherSearchState } from './state/weather-search.state';
import { initialWeatherUiState, WeatherUiState } from './state/weather-ui.state';

export interface WeatherState {
  search: WeatherSearchState;
  saved: WeatherSavedState;
  dashboard: WeatherDashboardState;
  preferences: WeatherPreferencesState;
  map: WeatherMapState;
  ui: WeatherUiState;
}

export interface WeatherAppState {
  searchQuery: string;
  searchResults: WeatherLocation[];
  favorites: WeatherLocation[];
  recentSearches: WeatherLocation[];
  comparisonSnapshots: ComparisonSnapshot[];
  activeDashboard: WeatherDashboard | null;
  loadingSearch: boolean;
  loadingWeather: boolean;
  refreshInProgress: boolean;
  errorMessage: string;
  offlineMessage: string;
  staleMessage: string;
  apiMessage: string;
  warningMessages: string[];
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  selectedMapLayer: MapLayerKey;
  autoRefresh: boolean;
  localTimestamp: number;
  temperatureChart: ChartSeries | null;
  precipitationChart: ChartSeries | null;
  windChart: ChartSeries | null;
}

export const initialWeatherState: WeatherState = {
  search: initialWeatherSearchState,
  saved: initialWeatherSavedState,
  dashboard: initialWeatherDashboardState,
  preferences: initialWeatherPreferencesState,
  map: initialWeatherMapState,
  ui: initialWeatherUiState
};

export function toWeatherAppState(state: WeatherState): WeatherAppState {
  return {
    searchQuery: state.search.query,
    searchResults: state.search.results,
    favorites: state.saved.favorites,
    recentSearches: state.saved.recentSearches,
    comparisonSnapshots: state.saved.comparisonSnapshots,
    activeDashboard: state.dashboard.activeDashboard,
    loadingSearch: state.search.loading,
    loadingWeather: state.dashboard.loadingWeather,
    refreshInProgress: state.dashboard.refreshInProgress,
    errorMessage: state.dashboard.errorMessage,
    offlineMessage: state.ui.offlineMessage,
    staleMessage: state.dashboard.staleMessage,
    apiMessage: state.dashboard.apiMessage,
    warningMessages: state.dashboard.warningMessages,
    temperatureUnit: state.preferences.temperatureUnit,
    measurementSystem: state.preferences.measurementSystem,
    selectedMapLayer: state.map.selectedMapLayer,
    autoRefresh: state.preferences.autoRefresh,
    localTimestamp: state.dashboard.localTimestamp,
    temperatureChart: state.dashboard.temperatureChart,
    precipitationChart: state.dashboard.precipitationChart,
    windChart: state.dashboard.windChart
  };
}

export const initialWeatherAppState: WeatherAppState = toWeatherAppState(initialWeatherState);
