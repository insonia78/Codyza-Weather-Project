import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, Observable, catchError, concatMap, from, map, of, switchMap, tap, withLatestFrom } from 'rxjs';

import {
  ChartSeries,
  ComparisonSnapshot,
  MeasurementSystem,
  PersistedSettings,
  TemperatureUnit,
  WeatherDashboard,
  WeatherLocation
} from '../../models/weather.models';
import { LocalStorageService } from '../../services/local-storage.service';
import { WeatherService } from '../../services/weather.service';
import { WeatherActions } from './weather.actions';
import { WEATHER_STORAGE_KEYS, WEATHER_STORAGE_KEY_VALUES } from './weather-storage.keys';
import {
  selectActiveDashboard,
  selectAutoRefresh,
  selectComparisonSnapshots,
  selectMeasurementSystem,
  selectRecentSearches,
  selectSelectedMapLayer,
  selectTemperatureUnit
} from './weather.feature';

@Injectable()
export class WeatherEffects {
  readonly searchLocations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.searchLocations),
      map(({ query }) => query.trim()),
      map((query) => query.length >= 2
        ? query
        : null),
      map((query) => {
        if (!query) {
          return WeatherActions.searchLocationsFailure({
            message: 'Enter at least 2 characters to search for a location.'
          });
        }

        return query;
      }),
      switchMap((actionOrQuery) => {
        if (typeof actionOrQuery !== 'string') {
          return of(actionOrQuery);
        }

        return this.weatherService.searchLocations(actionOrQuery).pipe(
          map((results) => WeatherActions.searchLocationsSuccess({ results })),
          catchError((error: Error) => of(WeatherActions.searchLocationsFailure({ message: error.message })))
        );
      })
    )
  );

  readonly loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.loadDashboard),
      withLatestFrom(this.store.select(selectRecentSearches)),
      switchMap(([{ location, forceRefresh, addToRecent }, recentSearches]) =>
        this.weatherService.getDashboard(location, forceRefresh).pipe(
          switchMap((dashboard) => addToRecent
            ? from([
                WeatherActions.loadDashboardSuccess({ dashboard, addToRecent }),
                WeatherActions.setRecentSearches({
                  recentSearches: this.buildRecentSearches(recentSearches, location)
                })
              ])
            : of(WeatherActions.loadDashboardSuccess({ dashboard, addToRecent }))
          ),
          catchError((error: Error) => of(WeatherActions.loadDashboardFailure({
            errorMessage: error.message,
            cachedDashboard: this.storage.getItem<WeatherDashboard>(WEATHER_STORAGE_KEYS.lastDashboard)
          })))
        )
      )
    )
  );

  readonly loadDashboardFromCoordinates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.loadDashboardFromCoordinates),
      switchMap(({ lat, lon, source, forceRefresh, addToRecent }) =>
        this.weatherService.reverseGeocode(lat, lon, source).pipe(
          map((locations) => {
            const location = locations[0];
            if (!location) {
              return WeatherActions.loadDashboardFailure({
                errorMessage: 'No matching location was found for the selected coordinates.',
                cachedDashboard: null
              });
            }

            return WeatherActions.loadDashboard({ location, forceRefresh, addToRecent });
          }),
          catchError((error: Error) => of(WeatherActions.loadDashboardFailure({
            errorMessage: error.message,
            cachedDashboard: null
          })))
        )
      )
    )
  );

  readonly useCurrentLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.useCurrentLocation),
      switchMap(() => {
        if (!navigator.geolocation) {
          return of(WeatherActions.useCurrentLocationFailure({
            errorMessage: 'Geolocation is not available in this browser.'
          }));
        }

        return this.getCurrentPosition().pipe(
          map((position) => WeatherActions.loadDashboardFromCoordinates({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            source: 'geolocation',
            forceRefresh: false,
            addToRecent: true
          })),
          catchError((error: GeolocationPositionError) => of(WeatherActions.useCurrentLocationFailure({
            errorMessage: `Unable to access current location: ${error.message}`
          })))
        );
      })
    )
  );

  readonly refreshWeather$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.refreshWeather),
      switchMap(({ location, forceRefresh }) => from([
        WeatherActions.loadDashboard({ location, forceRefresh, addToRecent: false }),
        WeatherActions.refreshComparisonSnapshots({ forceRefresh })
      ]))
    )
  );

  readonly addComparisonLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.addComparisonLocation),
      withLatestFrom(this.store.select(selectComparisonSnapshots)),
      switchMap(([{ location }, comparisonSnapshots]) => {
        if (comparisonSnapshots.some((entry) => entry.location.id === location.id)) {
          return EMPTY;
        }

        return this.weatherService.getDashboard(location).pipe(
          map((dashboard) => WeatherActions.setComparisonSnapshots({
            comparisonSnapshots: [
              ...comparisonSnapshots,
              this.createComparisonSnapshot(dashboard)
            ].slice(0, 5)
          })),
          catchError((error: Error) => of(WeatherActions.setErrorMessage({ errorMessage: error.message })))
        );
      })
    )
  );

  readonly refreshComparisonSnapshots$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WeatherActions.refreshComparisonSnapshots),
      withLatestFrom(this.store.select(selectComparisonSnapshots)),
      switchMap(([{ forceRefresh }, comparisonSnapshots]) => {
        if (!comparisonSnapshots.length) {
          return EMPTY;
        }

        return from(comparisonSnapshots.map((entry) => entry.location)).pipe(
          concatMap((location) =>
            this.weatherService.getDashboard(location, forceRefresh).pipe(
              withLatestFrom(this.store.select(selectComparisonSnapshots)),
              map(([dashboard, currentSnapshots]) => WeatherActions.setComparisonSnapshots({
                comparisonSnapshots: currentSnapshots.map((entry) =>
                  entry.location.id === location.id ? this.createComparisonSnapshot(dashboard) : entry
                )
              })),
              catchError((error: Error) => of(WeatherActions.appendWarningMessage({
                warningMessage: `Comparison refresh failed for ${location.label}: ${error.message}`
              })))
            )
          )
        );
      })
    )
  );

  readonly deriveCharts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        WeatherActions.loadDashboardSuccess,
        WeatherActions.loadDashboardFailure,
        WeatherActions.setDashboardView,
        WeatherActions.setCachedDashboardFallback,
        WeatherActions.setTemperatureUnit,
        WeatherActions.setMeasurementSystem,
        WeatherActions.resetState
      ),
      withLatestFrom(
        this.store.select(selectActiveDashboard),
        this.store.select(selectTemperatureUnit),
        this.store.select(selectMeasurementSystem)
      ),
      map(([_, dashboard, temperatureUnit, measurementSystem]) => WeatherActions.setCharts({
        charts: this.buildCharts(dashboard, temperatureUnit, measurementSystem)
      }))
    )
  );

  readonly persistFavorites$ = createEffect(
    () => this.actions$.pipe(
      ofType(WeatherActions.setFavorites),
      tap(({ favorites }) => {
        this.storage.setItem(WEATHER_STORAGE_KEYS.favorites, favorites);
      })
    ),
    { dispatch: false }
  );

  readonly persistRecentSearches$ = createEffect(
    () => this.actions$.pipe(
      ofType(WeatherActions.setRecentSearches),
      tap(({ recentSearches }) => {
        this.storage.setItem(WEATHER_STORAGE_KEYS.recentSearches, recentSearches);
      })
    ),
    { dispatch: false }
  );

  readonly persistComparisonLocations$ = createEffect(
    () => this.actions$.pipe(
      ofType(WeatherActions.setComparisonSnapshots),
      tap(({ comparisonSnapshots }) => {
        this.storage.setItem(
          WEATHER_STORAGE_KEYS.comparison,
          comparisonSnapshots.map((entry) => entry.location)
        );
      })
    ),
    { dispatch: false }
  );

  readonly persistDashboard$ = createEffect(
    () => this.actions$.pipe(
      ofType(
        WeatherActions.loadDashboardSuccess,
        WeatherActions.setDashboardView,
        WeatherActions.setCachedDashboardFallback
      ),
      tap((action) => {
        const activeDashboard = 'dashboard' in action ? action.dashboard : action.activeDashboard;
        this.storage.setItem(WEATHER_STORAGE_KEYS.lastDashboard, activeDashboard);
      })
    ),
    { dispatch: false }
  );

  readonly persistSettings$ = createEffect(
    () => this.actions$.pipe(
      ofType(
        WeatherActions.setTemperatureUnit,
        WeatherActions.setMeasurementSystem,
        WeatherActions.setSelectedMapLayer,
        WeatherActions.setAutoRefresh
      ),
      tap(() => {
        this.storage.setItem<PersistedSettings>(WEATHER_STORAGE_KEYS.settings, {
          temperatureUnit: this.store.selectSignal(selectTemperatureUnit)(),
          measurementSystem: this.store.selectSignal(selectMeasurementSystem)(),
          selectedMapLayer: this.store.selectSignal(selectSelectedMapLayer)(),
          autoRefresh: this.store.selectSignal(selectAutoRefresh)()
        });
      })
    ),
    { dispatch: false }
  );

  readonly clearPersistedState$ = createEffect(
    () => this.actions$.pipe(
      ofType(WeatherActions.resetState),
      tap(() => {
        this.storage.removeItems(WEATHER_STORAGE_KEY_VALUES);
      })
    ),
    { dispatch: false }
  );

  constructor(
    private readonly actions$: Actions,
    private readonly weatherService: WeatherService,
    private readonly storage: LocalStorageService,
    private readonly store: Store
  ) {}

  private getCurrentPosition(): Observable<GeolocationPosition> {
    return new Observable<GeolocationPosition>((observer) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next(position);
          observer.complete();
        },
        (error) => observer.error(error),
        {
          enableHighAccuracy: true,
          timeout: 10_000
        }
      );
    });
  }

  private buildRecentSearches(recentSearches: WeatherLocation[], location: WeatherLocation): WeatherLocation[] {
    return [location, ...recentSearches.filter((entry) => entry.id !== location.id)].slice(0, 8);
  }

  private createComparisonSnapshot(dashboard: WeatherDashboard): ComparisonSnapshot {
    const firstDailyPoint = dashboard.daily[0];
    return {
      location: dashboard.location,
      summary: dashboard.current.summary,
      icon: dashboard.current.icon,
      temperatureC: dashboard.current.temperatureC,
      feelsLikeC: dashboard.current.feelsLikeC,
      humidity: dashboard.current.humidity,
      windSpeedMs: dashboard.current.windSpeedMs,
      precipitationProbability: firstDailyPoint ? firstDailyPoint.precipitationProbability : 0,
      localTime: dashboard.current.observedAt + dashboard.timezoneOffset
    };
  }

  private buildCharts(
    dashboard: WeatherDashboard | null,
    temperatureUnit: TemperatureUnit,
    measurementSystem: MeasurementSystem
  ): Pick<{
    temperatureChart: ChartSeries | null;
    precipitationChart: ChartSeries | null;
    windChart: ChartSeries | null;
  }, 'temperatureChart' | 'precipitationChart' | 'windChart'> {
    if (!dashboard) {
      return {
        temperatureChart: null,
        precipitationChart: null,
        windChart: null
      };
    }

    return {
      temperatureChart: this.buildChartSeries(
        dashboard.hourly.map((point) => point.temperatureC),
        (value) => this.formatTemperature(value, temperatureUnit)
      ),
      precipitationChart: this.buildChartSeries(
        dashboard.hourly.map((point) => point.precipitationProbability),
        (value) => `${Math.round(value)}%`
      ),
      windChart: this.buildChartSeries(
        dashboard.hourly.map((point) => point.windSpeedMs),
        (value) => this.formatWind(value, measurementSystem)
      )
    };
  }

  private buildChartSeries(values: number[], formatter: (value: number) => string): ChartSeries | null {
    if (!values.length) {
      return null;
    }

    const width = 700;
    const height = 200;
    const paddingX = 24;
    const paddingY = 18;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

    const coordinates = values.map((value, index) => {
      const x = paddingX + step * index;
      const y = paddingY + ((max - value) / range) * (height - paddingY * 2);
      return { x, y, value };
    });

    const points = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
    const area = `${points} ${coordinates[coordinates.length - 1].x},${height - paddingY} ${coordinates[0].x},${height - paddingY}`;
    const labels = coordinates
      .filter((_, index) => index === 0 || index === coordinates.length - 1 || index === Math.floor(coordinates.length / 2))
      .map((point) => ({
        x: point.x,
        y: point.y - 10,
        value: formatter(point.value)
      }));

    return {
      points,
      area,
      labels,
      minLabel: formatter(min),
      maxLabel: formatter(max)
    };
  }

  private formatTemperature(valueCelsius: number, temperatureUnit: TemperatureUnit): string {
    const value = temperatureUnit === 'celsius'
      ? valueCelsius
      : (valueCelsius * 9) / 5 + 32;
    const suffix = temperatureUnit === 'celsius' ? 'C' : 'F';

    return `${Math.round(value)}°${suffix}`;
  }

  private formatWind(speedMs: number, measurementSystem: MeasurementSystem): string {
    if (measurementSystem === 'metric') {
      return `${Math.round(speedMs * 3.6)} km/h`;
    }

    return `${(speedMs * 2.23694).toFixed(1)} mph`;
  }
}
