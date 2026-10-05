import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import {
  ChartSeries,
  ComparisonSnapshot,
  MapLayerKey,
  MeasurementSystem,
  TemperatureUnit,
  WeatherDashboard,
  WeatherLocation
} from '../models/weather.models';
import { WeatherActions } from '../store/weather/weather.actions';
import {
  selectActiveDashboard,
  selectApiMessage,
  selectAutoRefresh,
  selectComparisonSnapshots,
  selectErrorMessage,
  selectFavorites,
  selectLoadingSearch,
  selectLoadingWeather,
  selectLocalTimestamp,
  selectMeasurementSystem,
  selectOfflineMessage,
  selectPrecipitationChart,
  selectRecentSearches,
  selectRefreshInProgress,
  selectSearchQuery,
  selectSearchResults,
  selectSelectedMapLayer,
  selectStaleMessage,
  selectTemperatureChart,
  selectTemperatureUnit,
  selectWarningMessages,
  selectWeatherState,
  selectWindChart
} from '../store/weather/weather.feature';
import { WeatherAppState, initialWeatherAppState } from '../store/weather/weather.state';

export { WeatherAppState, initialWeatherAppState } from '../store/weather/weather.state';

@Injectable({
  providedIn: 'root'
})
export class WeatherStore {
  private readonly stateSubject = new BehaviorSubject<WeatherAppState>(initialWeatherAppState);

  readonly state$ = this.store.select(selectWeatherState);
  readonly searchQuery$ = this.store.select(selectSearchQuery);
  readonly searchResults$ = this.store.select(selectSearchResults);
  readonly favorites$ = this.store.select(selectFavorites);
  readonly recentSearches$ = this.store.select(selectRecentSearches);
  readonly comparisonSnapshots$ = this.store.select(selectComparisonSnapshots);
  readonly activeDashboard$ = this.store.select(selectActiveDashboard);
  readonly loadingSearch$ = this.store.select(selectLoadingSearch);
  readonly loadingWeather$ = this.store.select(selectLoadingWeather);
  readonly refreshInProgress$ = this.store.select(selectRefreshInProgress);
  readonly temperatureUnit$ = this.store.select(selectTemperatureUnit);
  readonly measurementSystem$ = this.store.select(selectMeasurementSystem);
  readonly selectedMapLayer$ = this.store.select(selectSelectedMapLayer);
  readonly autoRefresh$ = this.store.select(selectAutoRefresh);
  readonly localTimestamp$ = this.store.select(selectLocalTimestamp);
  readonly warningMessages$ = this.store.select(selectWarningMessages);
  readonly temperatureChart$ = this.store.select(selectTemperatureChart);
  readonly precipitationChart$ = this.store.select(selectPrecipitationChart);
  readonly windChart$ = this.store.select(selectWindChart);

  constructor(private readonly store: Store) {
    this.state$.subscribe((state) => {
      this.stateSubject.next(state);
    });
  }

  get snapshot(): WeatherAppState {
    return this.stateSubject.value;
  }

  select<K extends keyof WeatherAppState>(key: K): Observable<WeatherAppState[K]> {
    return this.state$.pipe(
      map((state) => state[key]),
      distinctUntilChanged()
    );
  }

  hydrateState(patch: Partial<WeatherAppState>): void {
    this.store.dispatch(WeatherActions.hydrateState({ patch }));
  }

  setSearchQuery(searchQuery: string): void {
    this.store.dispatch(WeatherActions.setSearchQuery({ searchQuery }));
  }

  searchLocations(query: string): void {
    this.store.dispatch(WeatherActions.searchLocations({ query }));
  }

  loadDashboard(location: WeatherLocation, forceRefresh: boolean, addToRecent: boolean): void {
    this.store.dispatch(WeatherActions.loadDashboard({ location, forceRefresh, addToRecent }));
  }

  loadDashboardFromCoordinates(
    lat: number,
    lon: number,
    source: WeatherLocation['source'],
    forceRefresh: boolean,
    addToRecent: boolean
  ): void {
    this.store.dispatch(WeatherActions.loadDashboardFromCoordinates({
      lat,
      lon,
      source,
      forceRefresh,
      addToRecent
    }));
  }

  useCurrentLocation(): void {
    this.store.dispatch(WeatherActions.useCurrentLocation());
  }

  refreshWeather(location: WeatherLocation, forceRefresh: boolean): void {
    this.store.dispatch(WeatherActions.refreshWeather({ location, forceRefresh }));
  }

  addComparisonLocation(location: WeatherLocation): void {
    this.store.dispatch(WeatherActions.addComparisonLocation({ location }));
  }

  refreshComparisonSnapshots(forceRefresh: boolean): void {
    this.store.dispatch(WeatherActions.refreshComparisonSnapshots({ forceRefresh }));
  }

  setSearchResults(searchResults: WeatherLocation[]): void {
    this.store.dispatch(WeatherActions.searchLocationsSuccess({ results: searchResults }));
  }

  clearSearchResults(): void {
    this.store.dispatch(WeatherActions.clearSearchResults());
  }

  setSearchLoading(loadingSearch: boolean): void {
    this.store.dispatch(WeatherActions.setSearchLoading({ loadingSearch }));
  }

  setFavorites(favorites: WeatherLocation[]): void {
    this.store.dispatch(WeatherActions.setFavorites({ favorites }));
  }

  setRecentSearches(recentSearches: WeatherLocation[]): void {
    this.store.dispatch(WeatherActions.setRecentSearches({ recentSearches }));
  }

  setComparisonSnapshots(comparisonSnapshots: ComparisonSnapshot[]): void {
    this.store.dispatch(WeatherActions.setComparisonSnapshots({ comparisonSnapshots }));
  }

  setActiveDashboard(activeDashboard: WeatherDashboard | null): void {
    this.store.dispatch(WeatherActions.setActiveDashboard({ activeDashboard }));
  }

  setLoadingWeather(loadingWeather: boolean): void {
    this.store.dispatch(WeatherActions.setLoadingWeather({ loadingWeather }));
  }

  setRefreshInProgress(refreshInProgress: boolean): void {
    this.store.dispatch(WeatherActions.setRefreshInProgress({ refreshInProgress }));
  }

  setErrorMessage(errorMessage: string): void {
    this.store.dispatch(WeatherActions.setErrorMessage({ errorMessage }));
  }

  setOfflineMessage(offlineMessage: string): void {
    this.store.dispatch(WeatherActions.setOfflineMessage({ offlineMessage }));
  }

  setStaleMessage(staleMessage: string): void {
    this.store.dispatch(WeatherActions.setStaleMessage({ staleMessage }));
  }

  setApiMessage(apiMessage: string): void {
    this.store.dispatch(WeatherActions.setApiMessage({ apiMessage }));
  }

  clearTransientMessages(): void {
    this.store.dispatch(WeatherActions.clearTransientMessages());
  }

  setWarningMessages(warningMessages: string[]): void {
    this.store.dispatch(WeatherActions.setWarningMessages({ warningMessages }));
  }

  appendWarningMessage(warningMessage: string): void {
    this.store.dispatch(WeatherActions.appendWarningMessage({ warningMessage }));
  }

  setTemperatureUnit(temperatureUnit: TemperatureUnit): void {
    this.store.dispatch(WeatherActions.setTemperatureUnit({ temperatureUnit }));
  }

  setMeasurementSystem(measurementSystem: MeasurementSystem): void {
    this.store.dispatch(WeatherActions.setMeasurementSystem({ measurementSystem }));
  }

  setSelectedMapLayer(selectedMapLayer: MapLayerKey): void {
    this.store.dispatch(WeatherActions.setSelectedMapLayer({ selectedMapLayer }));
  }

  setAutoRefresh(autoRefresh: boolean): void {
    this.store.dispatch(WeatherActions.setAutoRefresh({ autoRefresh }));
  }

  setLocalTimestamp(localTimestamp: number): void {
    this.store.dispatch(WeatherActions.setLocalTimestamp({ localTimestamp }));
  }

  setCharts(charts: Pick<WeatherAppState, 'temperatureChart' | 'precipitationChart' | 'windChart'>): void {
    this.store.dispatch(WeatherActions.setCharts({ charts }));
  }

  setDashboardView(activeDashboard: WeatherDashboard, warningMessages: string[], apiMessage = ''): void {
    this.store.dispatch(WeatherActions.setDashboardView({ activeDashboard, warningMessages, apiMessage }));
  }

  setCachedDashboardFallback(activeDashboard: WeatherDashboard, warningMessages: string[], staleMessage: string): void {
    this.store.dispatch(WeatherActions.setCachedDashboardFallback({ activeDashboard, warningMessages, staleMessage }));
  }

  setWeatherLoadingState(loadingWeather: boolean, refreshInProgress: boolean): void {
    this.store.dispatch(WeatherActions.setWeatherLoadingState({ loadingWeather, refreshInProgress }));
  }

  resetState(): void {
    this.store.dispatch(WeatherActions.resetState());
  }
}
