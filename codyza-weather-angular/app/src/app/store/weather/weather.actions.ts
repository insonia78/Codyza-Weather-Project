import { createActionGroup, emptyProps, props } from '@ngrx/store';

import {
  ChartSeries,
  ComparisonSnapshot,
  MapLayerKey,
  MeasurementSystem,
  TemperatureUnit,
  WeatherDashboard,
  WeatherLocation
} from '../../models/weather.models';
import { WeatherAppState } from './weather.state';

export const WeatherActions = createActionGroup({
  source: 'Weather',
  events: {
    'Hydrate State': props<{ patch: Partial<WeatherAppState> }>(),
    'Set Search Query': props<{ searchQuery: string }>(),
    'Search Locations': props<{ query: string }>(),
    'Search Locations Success': props<{ results: WeatherLocation[] }>(),
    'Search Locations Failure': props<{ message: string }>(),
    'Load Dashboard': props<{ location: WeatherLocation; forceRefresh: boolean; addToRecent: boolean }>(),
    'Load Dashboard Success': props<{ dashboard: WeatherDashboard; addToRecent: boolean }>(),
    'Load Dashboard Failure': props<{ errorMessage: string; cachedDashboard: WeatherDashboard | null }>(),
    'Load Dashboard From Coordinates': props<{
      lat: number;
      lon: number;
      source: WeatherLocation['source'];
      forceRefresh: boolean;
      addToRecent: boolean;
    }>(),
    'Use Current Location': emptyProps(),
    'Use Current Location Failure': props<{ errorMessage: string }>(),
    'Refresh Weather': props<{ location: WeatherLocation; forceRefresh: boolean }>(),
    'Add Comparison Location': props<{ location: WeatherLocation }>(),
    'Clear Search Results': emptyProps(),
    'Set Search Loading': props<{ loadingSearch: boolean }>(),
    'Set Favorites': props<{ favorites: WeatherLocation[] }>(),
    'Set Recent Searches': props<{ recentSearches: WeatherLocation[] }>(),
    'Set Comparison Snapshots': props<{ comparisonSnapshots: ComparisonSnapshot[] }>(),
    'Set Active Dashboard': props<{ activeDashboard: WeatherDashboard | null }>(),
    'Set Loading Weather': props<{ loadingWeather: boolean }>(),
    'Set Refresh In Progress': props<{ refreshInProgress: boolean }>(),
    'Set Error Message': props<{ errorMessage: string }>(),
    'Set Offline Message': props<{ offlineMessage: string }>(),
    'Set Stale Message': props<{ staleMessage: string }>(),
    'Set Api Message': props<{ apiMessage: string }>(),
    'Clear Transient Messages': emptyProps(),
    'Set Warning Messages': props<{ warningMessages: string[] }>(),
    'Append Warning Message': props<{ warningMessage: string }>(),
    'Set Temperature Unit': props<{ temperatureUnit: TemperatureUnit }>(),
    'Set Measurement System': props<{ measurementSystem: MeasurementSystem }>(),
    'Set Selected Map Layer': props<{ selectedMapLayer: MapLayerKey }>(),
    'Set Auto Refresh': props<{ autoRefresh: boolean }>(),
    'Set Local Timestamp': props<{ localTimestamp: number }>(),
    'Set Charts': props<{ charts: Pick<WeatherAppState, 'temperatureChart' | 'precipitationChart' | 'windChart'> }>(),
    'Refresh Comparison Snapshots': props<{ forceRefresh: boolean }>(),
    'Set Dashboard View': props<{ activeDashboard: WeatherDashboard; warningMessages: string[]; apiMessage?: string }>(),
    'Set Cached Dashboard Fallback': props<{ activeDashboard: WeatherDashboard; warningMessages: string[]; staleMessage: string }>(),
    'Set Weather Loading State': props<{ loadingWeather: boolean; refreshInProgress: boolean }>(),
    'Reset State': emptyProps()
  }
});
