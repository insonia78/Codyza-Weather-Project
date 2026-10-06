import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideEffects } from '@ngrx/effects';
import { provideStore, provideState } from '@ngrx/store';
import { of, Subject, throwError } from 'rxjs';

import { AppComponent } from './app.component';
import { WeatherService } from './services/weather.service';
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
    const redirectSpy = spyOn<any>(app, 'redirectToRootApp').and.stub();
    const weatherService = TestBed.inject(WeatherService);
    spyOn(weatherService, 'logout').and.returnValue(of({ revoked: true }));

    localStorage.setItem(WEATHER_STORAGE_KEYS.favorites, JSON.stringify([{ id: '1' }]));
    localStorage.setItem('jwt_token', 'token');
    app.onSearchChange('Rome');

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const logoutButton = buttons.find((button) => button.textContent?.trim() === 'Logout');

    expect(logoutButton).toBeTruthy();

    logoutButton?.click();
    fixture.detectChanges();

    expect(app.searchQuery).toBe('');
    expect(localStorage.getItem(WEATHER_STORAGE_KEYS.favorites)).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(redirectSpy).toHaveBeenCalled();
  });

  it('should keep the user on the page when logout revocation fails', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const redirectSpy = spyOn<any>(app, 'redirectToRootApp').and.stub();
    const weatherService = TestBed.inject(WeatherService);
    spyOn(weatherService, 'logout').and.returnValue(throwError(() => new Error('Token revocation failed.')));

    localStorage.setItem('jwt_token', 'token');

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const logoutButton = buttons.find((button) => button.textContent?.trim() === 'Logout');

    logoutButton?.click();
    fixture.detectChanges();

    expect(localStorage.getItem('jwt_token')).toBe('token');
    expect(app.errorMessage).toContain('Logout failed: Token revocation failed.');
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('should show a logging out message while token revocation is pending', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const logoutSubject = new Subject<{ revoked: boolean }>();
    const weatherService = TestBed.inject(WeatherService);
    spyOn(weatherService, 'logout').and.returnValue(logoutSubject.asObservable());

    localStorage.setItem('jwt_token', 'token');

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const logoutButton = buttons.find((button) => button.textContent?.trim() === 'Logout');

    logoutButton?.click();
    fixture.detectChanges();

    expect(app.isLogoutInProgress).toBeTrue();
    expect(app.apiMessage).toContain('Logging out... Waiting for token revocation confirmation.');
    expect(fixture.nativeElement.textContent).toContain('Logging out... Waiting for token revocation confirmation.');
  });
});
