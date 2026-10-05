import { TestBed } from '@angular/core/testing';
import { provideStore, provideState } from '@ngrx/store';

import { WeatherStore, initialWeatherAppState } from './weather-store.service';
import { weatherFeature } from '../store/weather/weather.feature';

describe('WeatherStore', () => {
  let store: WeatherStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideStore(),
        provideState(weatherFeature)
      ]
    });
    store = TestBed.inject(WeatherStore);
    store.resetState();
  });

  it('should expose the initial weather state', () => {
    expect(store.snapshot.searchQuery).toBe(initialWeatherAppState.searchQuery);
    expect(store.snapshot.temperatureUnit).toBe(initialWeatherAppState.temperatureUnit);
    expect(store.snapshot.activeDashboard).toBeNull();
  });

  it('should patch state without losing untouched values', () => {
    store.setSearchQuery('Rome');
    store.setSearchLoading(true);

    expect(store.snapshot.searchQuery).toBe('Rome');
    expect(store.snapshot.loadingSearch).toBeTrue();
    expect(store.snapshot.measurementSystem).toBe(initialWeatherAppState.measurementSystem);
  });
});
