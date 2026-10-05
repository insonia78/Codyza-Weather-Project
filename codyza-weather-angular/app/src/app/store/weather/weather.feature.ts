import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import { WeatherActions } from './weather.actions';
import { initialWeatherState, initialWeatherAppState, toWeatherAppState } from './weather.state';

const weatherFeatureDefinition = createFeature({
  name: 'weather',
  reducer: createReducer(
    initialWeatherState,
    on(WeatherActions.hydrateState, (state, { patch }) => ({
      ...state,
      search: {
        ...state.search,
        query: patch.searchQuery ?? state.search.query,
        results: patch.searchResults ?? state.search.results,
        loading: patch.loadingSearch ?? state.search.loading
      },
      saved: {
        ...state.saved,
        favorites: patch.favorites ?? state.saved.favorites,
        recentSearches: patch.recentSearches ?? state.saved.recentSearches,
        comparisonSnapshots: patch.comparisonSnapshots ?? state.saved.comparisonSnapshots
      },
      dashboard: {
        ...state.dashboard,
        activeDashboard: patch.activeDashboard ?? state.dashboard.activeDashboard,
        loadingWeather: patch.loadingWeather ?? state.dashboard.loadingWeather,
        refreshInProgress: patch.refreshInProgress ?? state.dashboard.refreshInProgress,
        errorMessage: patch.errorMessage ?? state.dashboard.errorMessage,
        staleMessage: patch.staleMessage ?? state.dashboard.staleMessage,
        apiMessage: patch.apiMessage ?? state.dashboard.apiMessage,
        warningMessages: patch.warningMessages ?? state.dashboard.warningMessages,
        localTimestamp: patch.localTimestamp ?? state.dashboard.localTimestamp,
        temperatureChart: patch.temperatureChart ?? state.dashboard.temperatureChart,
        precipitationChart: patch.precipitationChart ?? state.dashboard.precipitationChart,
        windChart: patch.windChart ?? state.dashboard.windChart
      },
      preferences: {
        ...state.preferences,
        temperatureUnit: patch.temperatureUnit ?? state.preferences.temperatureUnit,
        measurementSystem: patch.measurementSystem ?? state.preferences.measurementSystem,
        autoRefresh: patch.autoRefresh ?? state.preferences.autoRefresh
      },
      map: {
        ...state.map,
        selectedMapLayer: patch.selectedMapLayer ?? state.map.selectedMapLayer
      },
      ui: {
        ...state.ui,
        offlineMessage: patch.offlineMessage ?? state.ui.offlineMessage
      }
    })),
    on(WeatherActions.setSearchQuery, (state, { searchQuery }) => ({
      ...state,
      search: { ...state.search, query: searchQuery }
    })),
    on(WeatherActions.searchLocations, (state) => ({
      ...state,
      search: { ...state.search, loading: true },
      dashboard: {
        ...state.dashboard,
        errorMessage: '',
        apiMessage: ''
      }
    })),
    on(WeatherActions.searchLocationsSuccess, (state, { results }) => ({
      ...state,
      search: {
        ...state.search,
        loading: false,
        results
      },
      dashboard: {
        ...state.dashboard,
        apiMessage: results.length
          ? ''
          : 'No matching locations were found. Try adding a country code for ZIP or airport-style searches.'
      }
    })),
    on(WeatherActions.searchLocationsFailure, (state, { message }) => ({
      ...state,
      search: {
        ...state.search,
        loading: false,
        results: []
      },
      dashboard: {
        ...state.dashboard,
        apiMessage: message
      }
    })),
    on(WeatherActions.loadDashboard, WeatherActions.loadDashboardFromCoordinates, WeatherActions.useCurrentLocation, (state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        loadingWeather: true,
        errorMessage: '',
        staleMessage: '',
        apiMessage: ''
      }
    })),
    on(WeatherActions.loadDashboardSuccess, (state, { dashboard }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        activeDashboard: dashboard,
        warningMessages: dashboard.warnings,
        apiMessage: '',
        loadingWeather: false,
        refreshInProgress: false
      }
    })),
    on(WeatherActions.loadDashboardFailure, (state, { errorMessage, cachedDashboard }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        errorMessage,
        activeDashboard: cachedDashboard || state.dashboard.activeDashboard,
        warningMessages: cachedDashboard
          ? [
              ...cachedDashboard.warnings,
              `Showing the last cached update because the latest request failed: ${errorMessage}`
            ]
          : state.dashboard.warningMessages,
        staleMessage: cachedDashboard
          ? 'Live refresh failed, so the most recent cached dashboard is still on screen.'
          : state.dashboard.staleMessage,
        loadingWeather: false,
        refreshInProgress: false
      }
    })),
    on(WeatherActions.useCurrentLocationFailure, (state, { errorMessage }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        loadingWeather: false,
        errorMessage
      }
    })),
    on(WeatherActions.refreshWeather, (state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        loadingWeather: true,
        refreshInProgress: true,
        errorMessage: '',
        staleMessage: '',
        apiMessage: ''
      }
    })),
    on(WeatherActions.clearSearchResults, (state) => ({
      ...state,
      search: { ...state.search, results: [] }
    })),
    on(WeatherActions.setSearchLoading, (state, { loadingSearch }) => ({
      ...state,
      search: { ...state.search, loading: loadingSearch }
    })),
    on(WeatherActions.setFavorites, (state, { favorites }) => ({
      ...state,
      saved: { ...state.saved, favorites }
    })),
    on(WeatherActions.setRecentSearches, (state, { recentSearches }) => ({
      ...state,
      saved: { ...state.saved, recentSearches }
    })),
    on(WeatherActions.setComparisonSnapshots, (state, { comparisonSnapshots }) => ({
      ...state,
      saved: { ...state.saved, comparisonSnapshots }
    })),
    on(WeatherActions.setActiveDashboard, (state, { activeDashboard }) => ({
      ...state,
      dashboard: { ...state.dashboard, activeDashboard }
    })),
    on(WeatherActions.setLoadingWeather, (state, { loadingWeather }) => ({
      ...state,
      dashboard: { ...state.dashboard, loadingWeather }
    })),
    on(WeatherActions.setRefreshInProgress, (state, { refreshInProgress }) => ({
      ...state,
      dashboard: { ...state.dashboard, refreshInProgress }
    })),
    on(WeatherActions.setErrorMessage, (state, { errorMessage }) => ({
      ...state,
      dashboard: { ...state.dashboard, errorMessage }
    })),
    on(WeatherActions.setOfflineMessage, (state, { offlineMessage }) => ({
      ...state,
      ui: { ...state.ui, offlineMessage }
    })),
    on(WeatherActions.setStaleMessage, (state, { staleMessage }) => ({
      ...state,
      dashboard: { ...state.dashboard, staleMessage }
    })),
    on(WeatherActions.setApiMessage, (state, { apiMessage }) => ({
      ...state,
      dashboard: { ...state.dashboard, apiMessage }
    })),
    on(WeatherActions.clearTransientMessages, (state) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        errorMessage: '',
        staleMessage: '',
        apiMessage: ''
      }
    })),
    on(WeatherActions.setWarningMessages, (state, { warningMessages }) => ({
      ...state,
      dashboard: { ...state.dashboard, warningMessages }
    })),
    on(WeatherActions.appendWarningMessage, (state, { warningMessage }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        warningMessages: [...state.dashboard.warningMessages, warningMessage]
      }
    })),
    on(WeatherActions.setTemperatureUnit, (state, { temperatureUnit }) => ({
      ...state,
      preferences: { ...state.preferences, temperatureUnit }
    })),
    on(WeatherActions.setMeasurementSystem, (state, { measurementSystem }) => ({
      ...state,
      preferences: { ...state.preferences, measurementSystem }
    })),
    on(WeatherActions.setSelectedMapLayer, (state, { selectedMapLayer }) => ({
      ...state,
      map: { ...state.map, selectedMapLayer }
    })),
    on(WeatherActions.setAutoRefresh, (state, { autoRefresh }) => ({
      ...state,
      preferences: { ...state.preferences, autoRefresh }
    })),
    on(WeatherActions.setLocalTimestamp, (state, { localTimestamp }) => ({
      ...state,
      dashboard: { ...state.dashboard, localTimestamp }
    })),
    on(WeatherActions.setCharts, (state, { charts }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        ...charts
      }
    })),
    on(WeatherActions.setDashboardView, (state, { activeDashboard, warningMessages, apiMessage }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        activeDashboard,
        warningMessages,
        apiMessage: apiMessage || ''
      }
    })),
    on(WeatherActions.setCachedDashboardFallback, (state, { activeDashboard, warningMessages, staleMessage }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        activeDashboard,
        warningMessages,
        staleMessage
      }
    })),
    on(WeatherActions.setWeatherLoadingState, (state, { loadingWeather, refreshInProgress }) => ({
      ...state,
      dashboard: {
        ...state.dashboard,
        loadingWeather,
        refreshInProgress
      }
    })),
    on(WeatherActions.resetState, () => ({
      ...initialWeatherState,
      dashboard: {
        ...initialWeatherState.dashboard,
        localTimestamp: Date.now()
      }
    }))
  )
});

export const weatherFeature = weatherFeatureDefinition;
export const weatherFeatureKey = weatherFeatureDefinition.name;
export const weatherReducer = weatherFeatureDefinition.reducer;
export const selectWeatherFeatureState = weatherFeatureDefinition.selectWeatherState;

export const selectWeatherSearchState = createSelector(selectWeatherFeatureState, (state) => state.search);
export const selectWeatherSavedState = createSelector(selectWeatherFeatureState, (state) => state.saved);
export const selectWeatherDashboardState = createSelector(selectWeatherFeatureState, (state) => state.dashboard);
export const selectWeatherPreferencesState = createSelector(selectWeatherFeatureState, (state) => state.preferences);
export const selectWeatherMapState = createSelector(selectWeatherFeatureState, (state) => state.map);
export const selectWeatherUiState = createSelector(selectWeatherFeatureState, (state) => state.ui);

export const selectWeatherState = createSelector(selectWeatherFeatureState, (state) => toWeatherAppState(state));

export const selectSearchQuery = createSelector(selectWeatherSearchState, (state) => state.query);
export const selectSearchResults = createSelector(selectWeatherSearchState, (state) => state.results);
export const selectLoadingSearch = createSelector(selectWeatherSearchState, (state) => state.loading);

export const selectFavorites = createSelector(selectWeatherSavedState, (state) => state.favorites);
export const selectRecentSearches = createSelector(selectWeatherSavedState, (state) => state.recentSearches);
export const selectComparisonSnapshots = createSelector(selectWeatherSavedState, (state) => state.comparisonSnapshots);

export const selectActiveDashboard = createSelector(selectWeatherDashboardState, (state) => state.activeDashboard);
export const selectLoadingWeather = createSelector(selectWeatherDashboardState, (state) => state.loadingWeather);
export const selectRefreshInProgress = createSelector(selectWeatherDashboardState, (state) => state.refreshInProgress);
export const selectErrorMessage = createSelector(selectWeatherDashboardState, (state) => state.errorMessage);
export const selectStaleMessage = createSelector(selectWeatherDashboardState, (state) => state.staleMessage);
export const selectApiMessage = createSelector(selectWeatherDashboardState, (state) => state.apiMessage);
export const selectWarningMessages = createSelector(selectWeatherDashboardState, (state) => state.warningMessages);
export const selectLocalTimestamp = createSelector(selectWeatherDashboardState, (state) => state.localTimestamp);
export const selectTemperatureChart = createSelector(selectWeatherDashboardState, (state) => state.temperatureChart);
export const selectPrecipitationChart = createSelector(selectWeatherDashboardState, (state) => state.precipitationChart);
export const selectWindChart = createSelector(selectWeatherDashboardState, (state) => state.windChart);

export const selectTemperatureUnit = createSelector(selectWeatherPreferencesState, (state) => state.temperatureUnit);
export const selectMeasurementSystem = createSelector(selectWeatherPreferencesState, (state) => state.measurementSystem);
export const selectAutoRefresh = createSelector(selectWeatherPreferencesState, (state) => state.autoRefresh);

export const selectSelectedMapLayer = createSelector(selectWeatherMapState, (state) => state.selectedMapLayer);
export const selectOfflineMessage = createSelector(selectWeatherUiState, (state) => state.offlineMessage);

export const selectInitialWeatherAppState = () => initialWeatherAppState;
