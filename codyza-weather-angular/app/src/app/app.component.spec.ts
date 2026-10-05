import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideEffects } from '@ngrx/effects';
import { provideStore, provideState } from '@ngrx/store';

import { AppComponent } from './app.component';
import { WeatherEffects } from './store/weather/weather.effects';
import { weatherFeature } from './store/weather/weather.feature';
import { WEATHER_STORAGE_KEYS } from './store/weather/weather-storage.keys';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideStore(),
        provideState(weatherFeature),
        provideEffects(WeatherEffects)
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the Codyza Weather title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Codyza Weather');
  });

  it('should render the brand title and empty state guidance', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Codyza Weather');
    expect(compiled.textContent).toContain('Search any location to start');
  });

  it('should clear the search query and results', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.onSearchChange('Rome');
    app.clearSearch();

    expect(app.searchQuery).toBe('');
    expect(app.searchResults).toEqual([]);
    expect(app.loadingSearch).toBeFalse();
  });

  it('should reset state and clear persisted weather data', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    localStorage.setItem(WEATHER_STORAGE_KEYS.favorites, JSON.stringify([{ id: '1' }]));
    localStorage.setItem(WEATHER_STORAGE_KEYS.settings, JSON.stringify({ temperatureUnit: 'fahrenheit' }));

    app.onSearchChange('Rome');
    app.setTemperatureUnit('fahrenheit');
    app.resetApp();

    expect(app.searchQuery).toBe('');
    expect(app.temperatureUnit).toBe('celsius');
    expect(app.activeDashboard).toBeNull();
    expect(localStorage.getItem(WEATHER_STORAGE_KEYS.favorites)).toBeNull();
    expect(localStorage.getItem(WEATHER_STORAGE_KEYS.settings)).toBeNull();
  });

  it('should render a logout button that clears persisted weather data', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    localStorage.setItem(WEATHER_STORAGE_KEYS.favorites, JSON.stringify([{ id: '1' }]));
    app.onSearchChange('Rome');

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const logoutButton = buttons.find((button) => button.textContent?.trim() === 'Logout');

    expect(logoutButton).toBeTruthy();

    logoutButton?.click();
    fixture.detectChanges();

    expect(app.searchQuery).toBe('');
    expect(localStorage.getItem(WEATHER_STORAGE_KEYS.favorites)).toBeNull();
  });
});
