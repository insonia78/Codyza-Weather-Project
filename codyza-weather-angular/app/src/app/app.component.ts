import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, Subscription, combineLatest, debounceTime, distinctUntilChanged, fromEvent, interval, switchMap } from 'rxjs';

import { environment } from '../environments/environment';
import {
  ChartSeries,
  ComparisonSnapshot,
  DailyForecastPoint,
  HourlyForecastPoint,
  MapLayerKey,
  MeasurementSystem,
  NotificationPreferences,
  PersistedSettings,
  TemperatureUnit,
  WeatherDashboard,
  WeatherLocation,
  WeatherUserProfile
} from './models/weather.models';
import { LocalStorageService } from './services/local-storage.service';
import { WeatherStore } from './services/weather-store.service';
import { WEATHER_STORAGE_KEYS } from './store/weather/weather-storage.keys';
import { WeatherService } from './services/weather.service';
import { MetricCardComponent } from './components/metric-card.component';
import { StatusBannerComponent } from './components/status-banner.component';

type LayerOption = { key: MapLayerKey; label: string };
type MarkerVariant = 'circle' | 'pin';
type NotificationPreferenceKey = keyof NotificationPreferences;

let googleMapsScriptPromise: Promise<void> | null = null;

const defaultNotificationPreferences: NotificationPreferences = {
  dailySummary: true,
  severeWeather: true,
  airQuality: false,
  weekendOutlook: false
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const decodedPayload = atob(paddedPayload);
    const payload = JSON.parse(decodedPayload) as unknown;
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps JavaScript API.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps JavaScript API.')), { once: true });
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MetricCardComponent, StatusBannerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement') mapElement?: ElementRef<HTMLDivElement>;
  @ViewChild('notificationContainer') notificationContainer?: ElementRef<HTMLDivElement>;

  readonly title = 'Codyza Weather';
  readonly codyzaUrl = 'https://www.codyza.com';
  readonly providerName = this.weatherService.providerName;
  readonly supportsWeatherLayers = this.weatherService.supportsWeatherLayers;
  readonly layerOptions: LayerOption[] = this.supportsWeatherLayers
    ? [
        { key: 'clouds_new', label: this.weatherService.layerLabels['clouds_new'] },
        { key: 'precipitation_new', label: this.weatherService.layerLabels['precipitation_new'] },
        { key: 'temp_new', label: this.weatherService.layerLabels['temp_new'] },
        { key: 'wind_new', label: this.weatherService.layerLabels['wind_new'] }
      ]
    : [];

  private readonly subscriptions = new Subscription();

  private map: google.maps.Map | null = null;
  private mapClickListener: google.maps.MapsEventListener | null = null;
  private weatherLayerOverlay: google.maps.ImageMapType | null = null;
  private readonly markers: google.maps.Marker[] = [];
  private initialMapCentered = false;
  private autoRefreshSubscription: Subscription | null = null;
  private readonly appState = toSignal(this.weatherStore.state$, { initialValue: this.weatherStore.snapshot });
  private readonly activeDashboardState = computed(() => this.appState().activeDashboard);
  private readonly localTimestampState = computed(() => this.appState().localTimestamp);
  private readonly temperatureUnitState = computed(() => this.appState().temperatureUnit);
  private readonly measurementSystemState = computed(() => this.appState().measurementSystem);
  private readonly searchInput$ = new Subject<string>();
  private readonly profileSaveRequests$ = new Subject<void>();
  private logoutInProgress = false;
  private accountDeletionInProgress = false;
  private notificationPanelOpen = false;
  private notificationPreferencesState: NotificationPreferences = { ...defaultNotificationPreferences };
  private profileSyncInProgress = false;
  private profileSyncStateMessage = '';
  private profileUpdatedAt: string | null = null;
  private hydratingProfile = false;
  private observedComparisonSnapshots = false;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly storage: LocalStorageService,
    private readonly weatherStore: WeatherStore
  ) {}

  get searchQuery(): string {
    return this.appState().searchQuery;
  }

  get searchResults(): WeatherLocation[] {
    return this.appState().searchResults;
  }

  get favorites(): WeatherLocation[] {
    return this.appState().favorites;
  }

  get recentSearches(): WeatherLocation[] {
    return this.appState().recentSearches;
  }

  get comparisonSnapshots(): ComparisonSnapshot[] {
    return this.appState().comparisonSnapshots;
  }

  get activeDashboard(): WeatherDashboard | null {
    return this.appState().activeDashboard;
  }

  get loadingSearch(): boolean {
    return this.appState().loadingSearch;
  }

  get loadingWeather(): boolean {
    return this.appState().loadingWeather;
  }

  get refreshInProgress(): boolean {
    return this.appState().refreshInProgress;
  }

  get errorMessage(): string {
    return this.appState().errorMessage;
  }

  get offlineMessage(): string {
    return this.appState().offlineMessage;
  }

  get staleMessage(): string {
    return this.appState().staleMessage;
  }

  get apiMessage(): string {
    return this.appState().apiMessage;
  }

  get warningMessages(): string[] {
    return this.appState().warningMessages;
  }

  get temperatureUnit(): TemperatureUnit {
    return this.appState().temperatureUnit;
  }

  get measurementSystem(): MeasurementSystem {
    return this.appState().measurementSystem;
  }

  get selectedMapLayer(): MapLayerKey {
    return this.appState().selectedMapLayer;
  }

  get isLogoutInProgress(): boolean {
    return this.logoutInProgress;
  }

  get isAccountDeletionInProgress(): boolean {
    return this.accountDeletionInProgress;
  }

  get loggedInEmail(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const token = window.localStorage.getItem('jwt_token');
    if (!token) {
      return '';
    }

    const payload = decodeJwtPayload(token);
    const email = typeof payload?.['email'] === 'string'
      ? payload['email']
      : typeof payload?.['userId'] === 'string'
        ? payload['userId']
        : typeof payload?.['sub'] === 'string'
          ? payload['sub']
          : '';

    return email.trim();
  }

  get isNotificationPanelOpen(): boolean {
    return this.notificationPanelOpen;
  }

  get notificationItems(): string[] {
    if (!this.loggedInEmail) {
      return [];
    }

    const items = [
      `Signed in as ${this.loggedInEmail}.`,
      `Daily summary notifications are ${this.notificationPreferences.dailySummary ? 'enabled' : 'disabled'}.`,
      `Severe weather notifications are ${this.notificationPreferences.severeWeather ? 'enabled' : 'disabled'}.`,
    ];

    if (this.profileSyncStateMessage) {
      items.push(this.profileSyncStateMessage);
    }

    return items;
  }

  get autoRefresh(): boolean {
    return this.appState().autoRefresh;
  }

  get notificationPreferences(): NotificationPreferences {
    return this.notificationPreferencesState;
  }

  get isProfileSyncInProgress(): boolean {
    return this.profileSyncInProgress;
  }

  get profileSyncMessage(): string {
    if (!this.loggedInEmail) {
      return 'Sign in through the Codyza account flow to sync preferences, favorites, and comparisons.';
    }

    if (this.profileSyncStateMessage) {
      return this.profileSyncStateMessage;
    }

    return 'Profile settings sync automatically through the gateway.';
  }

  get protectedDashboardLastUpdated(): string {
    if (!this.profileUpdatedAt) {
      return 'Not synced yet';
    }

    return new Date(this.profileUpdatedAt).toLocaleString();
  }

  get localTimestamp(): number {
    return this.appState().localTimestamp;
  }

  get temperatureChart(): ChartSeries | null {
    return this.appState().temperatureChart;
  }

  get precipitationChart(): ChartSeries | null {
    return this.appState().precipitationChart;
  }

  get windChart(): ChartSeries | null {
    return this.appState().windChart;
  }

  get hasApiKey(): boolean {
    return this.weatherService.apiKeyConfigured;
  }

  get hasMapsApiKey(): boolean {
    return Boolean(environment.googleWeather.browserApiKey.trim());
  }

  get canSearch(): boolean {
    return this.searchQuery.trim().length >= 2 && !this.loadingSearch;
  }

  readonly currentLocalTime = computed(() => {
    const dashboard = this.activeDashboardState();
    if (!dashboard) {
      return '--';
    }

    return this.formatDateTime(this.localTimestampState() / 1000, dashboard.timezone, {
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });
  });

  readonly backgroundClass = computed(() => {
    const dashboard = this.activeDashboardState();
    const summary = dashboard?.current.summary.toLowerCase() || 'default';
    const isDaytime = this.isCurrentlyDaytime();

    if (summary.includes('thunder')) {
      return 'theme-storm';
    }
    if (summary.includes('snow')) {
      return 'theme-snow';
    }
    if (summary.includes('rain') || summary.includes('drizzle')) {
      return 'theme-rain';
    }
    if (summary.includes('cloud')) {
      return isDaytime ? 'theme-cloud-day' : 'theme-cloud-night';
    }

    return isDaytime ? 'theme-clear-day' : 'theme-clear-night';
  });
  ngOnInit(): void {
    this.restoreState();
    this.registerAutocompleteSearch();
    this.registerProtectedDashboardSync();
    this.loadProtectedDashboard();
    this.registerConnectivity();
    this.startClock();
    this.configureAutoRefresh();
  }

  ngAfterViewInit(): void {
    void this.initializeMap();
    this.registerMapStateSync();
  }

  ngOnDestroy(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.searchInput$.complete();
    this.profileSaveRequests$.complete();
    this.subscriptions.unsubscribe();
    this.clearGoogleMarkers();
    this.mapClickListener?.remove();
    this.mapClickListener = null;
    this.map = null;
  }

  onSearchChange(query: string): void {
    this.weatherStore.setSearchQuery(query);
    this.weatherStore.setErrorMessage('');
    this.weatherStore.setApiMessage('');

    if (query.trim().length < 2) {
      this.weatherStore.clearSearchResults();
      this.weatherStore.setSearchLoading(false);
      return;
    }

    this.searchInput$.next(query);
  }

  triggerSearch(): void {
    const normalizedQuery = this.searchQuery.trim();
    this.weatherStore.setErrorMessage('');
    this.weatherStore.setApiMessage('');

    if (normalizedQuery.length < 2) {
      this.weatherStore.clearSearchResults();
      this.weatherStore.setApiMessage('Enter at least 2 characters to search for a location.');
      return;
    }

    this.weatherStore.searchLocations(normalizedQuery);
  }

  clearSearch(): void {
    this.weatherStore.setSearchQuery('');
    this.weatherStore.clearSearchResults();
    this.weatherStore.setSearchLoading(false);
    this.weatherStore.setErrorMessage('');
    this.weatherStore.setApiMessage('');
  }

  selectLocation(location: WeatherLocation): void {
    this.weatherStore.setSearchQuery(location.label);
    this.weatherStore.clearSearchResults();
    this.weatherStore.loadDashboard(location, false, true);
  }

  refreshWeather(forceRefresh = true): void {
    if (!this.activeDashboard) {
      return;
    }

    this.weatherStore.refreshWeather(this.activeDashboard.location, forceRefresh);
  }

  resetApp(): void {
    this.weatherStore.resetState();
    this.initialMapCentered = false;
    this.notificationPreferencesState = { ...defaultNotificationPreferences };
    this.profileSyncStateMessage = '';
    this.profileUpdatedAt = null;
    this.profileSyncInProgress = false;
    this.hydratingProfile = false;
    this.clearGoogleMarkers();

    if (this.map) {
      this.map.setCenter({ lat: 20, lng: 0 });
      this.map.setZoom(2);
    }

    this.weatherStore.setOfflineMessage(
      navigator.onLine ? '' : 'You are offline. Codyza Weather will keep showing cached results until the connection returns.'
    );
    this.configureAutoRefresh();
  }

  logout(): void {
    if (this.logoutInProgress || this.accountDeletionInProgress) {
      return;
    }

    if (!localStorage.getItem('jwt_token')) {
      this.completeLogout();
      return;
    }

    this.logoutInProgress = true;
    this.weatherStore.setErrorMessage('');
    this.weatherStore.setApiMessage('Logging out... Waiting for token revocation confirmation.');

    this.weatherService.logout().subscribe({
      next: (response) => {
        if (!response.revoked) {
          this.logoutInProgress = false;
          this.weatherStore.setApiMessage('');
          this.weatherStore.setErrorMessage('Logout failed because token revocation was not confirmed.');
          return;
        }

        this.completeLogout();
      },
      error: (error: Error) => {
        this.logoutInProgress = false;
        this.weatherStore.setApiMessage('');
        this.weatherStore.setErrorMessage(`Logout failed: ${error.message}`);
      },
    });
  }

  deactivateAccount(): void {
    if (this.logoutInProgress || this.accountDeletionInProgress) {
      return;
    }

    if (!localStorage.getItem('jwt_token') || !this.loggedInEmail) {
      this.weatherStore.setErrorMessage('Account deactivation requires an active signed-in session.');
      return;
    }

    const confirmed = window.confirm(
      `Delete the Codyza Weather account for ${this.loggedInEmail}? This permanently removes the account, favorites, recent searches, saved comparisons, and profile settings.`,
    );
    if (!confirmed) {
      return;
    }

    this.accountDeletionInProgress = true;
    this.weatherStore.setErrorMessage('');
    this.weatherStore.setApiMessage('Deleting your account and saved weather data...');

    this.weatherService.deactivateAccount().subscribe({
      next: (response) => {
        if (!response.deleted) {
          this.accountDeletionInProgress = false;
          this.weatherStore.setApiMessage('');
          this.weatherStore.setErrorMessage('Account deletion failed because the backend did not confirm the deletion.');
          return;
        }

        this.completeLogout();
      },
      error: (error: Error) => {
        this.accountDeletionInProgress = false;
        this.weatherStore.setApiMessage('');
        this.weatherStore.setErrorMessage(`Account deletion failed: ${error.message}`);
      },
    });
  }

  toggleNotifications(): void {
    if (!this.loggedInEmail) {
      this.notificationPanelOpen = false;
      return;
    }

    this.notificationPanelOpen = !this.notificationPanelOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notificationPanelOpen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (this.notificationContainer?.nativeElement.contains(target)) {
      return;
    }

    this.notificationPanelOpen = false;
  }

  private completeLogout(): void {
    this.logoutInProgress = false;
    this.accountDeletionInProgress = false;
    this.notificationPanelOpen = false;
    this.weatherStore.setApiMessage('');
    localStorage.removeItem('jwt_token');
    this.resetApp();
    this.redirectToRootApp();
  }

  private redirectToRootApp(): void {
    window.location.assign(environment.rootAppUrl);
  }

  useCurrentLocation(): void {
    this.weatherStore.useCurrentLocation();
  }

  toggleFavorite(location: WeatherLocation): void {
    const favorites = this.isFavorite(location)
      ? this.favorites.filter((entry) => entry.id !== location.id)
      : [location, ...this.favorites.filter((entry) => entry.id !== location.id)].slice(0, 8);

    this.weatherStore.setFavorites(favorites);
    this.syncMapMarkers();
    this.scheduleProfileSync();
  }

  removeFavorite(location: WeatherLocation): void {
    const favorites = this.favorites.filter((entry) => entry.id !== location.id);
    this.weatherStore.setFavorites(favorites);
    this.syncMapMarkers();
    this.scheduleProfileSync();
  }

  addToComparison(location: WeatherLocation): void {
    this.weatherStore.addComparisonLocation(location);
  }

  removeComparison(locationId: string): void {
    this.weatherStore.setComparisonSnapshots(
      this.comparisonSnapshots.filter((entry) => entry.location.id !== locationId)
    );
    this.scheduleProfileSync();
  }

  setTemperatureUnit(unit: TemperatureUnit): void {
    this.weatherStore.setTemperatureUnit(unit);
    this.scheduleProfileSync();
  }

  setMeasurementSystem(system: MeasurementSystem): void {
    this.weatherStore.setMeasurementSystem(system);
    this.scheduleProfileSync();
  }

  setMapLayer(layer: MapLayerKey): void {
    this.weatherStore.setSelectedMapLayer(layer);
    this.updateWeatherLayer();
    this.scheduleProfileSync();
  }

  setAutoRefresh(autoRefresh: boolean): void {
    this.weatherStore.setAutoRefresh(autoRefresh);
    this.configureAutoRefresh();
    this.scheduleProfileSync();
  }

  setNotificationPreference(preference: NotificationPreferenceKey, enabled: boolean): void {
    this.notificationPreferencesState = {
      ...this.notificationPreferencesState,
      [preference]: enabled
    };
    this.scheduleProfileSync();
  }

  syncProtectedDashboard(): void {
    if (!this.loggedInEmail || this.profileSyncInProgress) {
      return;
    }

    this.profileSaveRequests$.next();
  }

  clearRecentSearchHistory(): void {
    if (!this.loggedInEmail) {
      return;
    }

    this.profileSyncInProgress = true;
    this.profileSyncStateMessage = 'Clearing synced recent searches...';
    this.weatherService.clearSearchHistory().subscribe({
      next: () => {
        this.weatherStore.setRecentSearches([]);
        this.profileSyncInProgress = false;
        this.profileUpdatedAt = new Date().toISOString();
        this.profileSyncStateMessage = 'Recent searches were cleared from your protected dashboard.';
      },
      error: (error: Error) => {
        this.profileSyncInProgress = false;
        this.profileSyncStateMessage = `Could not clear recent searches: ${error.message}`;
        this.weatherStore.appendWarningMessage(this.profileSyncStateMessage);
      }
    });
  }

  isFavorite(location: WeatherLocation): boolean {
    return this.favorites.some((entry) => entry.id === location.id);
  }

  formatTemperature(valueCelsius: number | null | undefined): string {
    if (valueCelsius === null || valueCelsius === undefined) {
      return '--';
    }

    const value = this.temperatureUnitState() === 'celsius'
      ? valueCelsius
      : (valueCelsius * 9) / 5 + 32;
    const suffix = this.temperatureUnitState() === 'celsius' ? 'C' : 'F';
    return `${Math.round(value)}°${suffix}`;
  }

  formatWind(speedMs: number | null | undefined): string {
    if (speedMs === null || speedMs === undefined) {
      return '--';
    }

    if (this.measurementSystemState() === 'metric') {
      return `${Math.round(speedMs * 3.6)} km/h`;
    }

    return `${(speedMs * 2.23694).toFixed(1)} mph`;
  }

  formatVisibility(meters: number): string {
    if (this.measurementSystemState() === 'metric') {
      return `${(meters / 1000).toFixed(1)} km`;
    }

    return `${(meters / 1609.34).toFixed(1)} mi`;
  }

  formatPressure(pressure: number): string {
    if (this.measurementSystemState() === 'metric') {
      return `${pressure} hPa`;
    }

    return `${(pressure * 0.02953).toFixed(2)} inHg`;
  }

  formatPrecipitation(amountMm: number): string {
    if (this.measurementSystemState() === 'metric') {
      return `${amountMm.toFixed(1)} mm`;
    }

    return `${(amountMm / 25.4).toFixed(2)} in`;
  }

  formatDateTime(
    unixSeconds: number,
    timezone: string,
    options: Intl.DateTimeFormatOptions
  ): string {
    const date = new Date(unixSeconds * 1000);

    try {
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: timezone
      }).format(date);
    } catch (error) {
      console.error(`Invalid timezone "${timezone}" from provider.`, error);
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
  }

  formatWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((((degrees % 360) + 360) % 360) / 45) % directions.length;
    return directions[index];
  }

  formatAirComponentValue(value: number): string {
    return `${value.toFixed(1)} ug/m3`;
  }

  locationBadge(location: WeatherLocation): string {
    if (location.category === 'airport') {
      return location.airportCode ? `Airport · ${location.airportCode}` : 'Airport';
    }

    if (location.category === 'postal_code') {
      return 'Postal code';
    }

    if (location.category === 'coordinates') {
      return 'Coordinates';
    }

    if (location.category === 'address') {
      return 'Address';
    }

    return 'City';
  }

  isWeatherIconUrl(iconCode: string): boolean {
    return iconCode.startsWith('http://') || iconCode.startsWith('https://');
  }

  weatherGlyph(iconCode: string): string {
    const glyphs: Record<string, string> = {
      '01d': '☀',
      '01n': '☾',
      '02d': '⛅',
      '02n': '☁',
      '03d': '☁',
      '03n': '☁',
      '04d': '☁',
      '04n': '☁',
      '09d': '🌧',
      '09n': '🌧',
      '10d': '🌦',
      '10n': '🌧',
      '11d': '⛈',
      '11n': '⛈',
      '13d': '❄',
      '13n': '❄',
      '50d': '🌫',
      '50n': '🌫'
    };

    if (glyphs[iconCode]) {
      return glyphs[iconCode];
    }

    const normalizedIcon = iconCode.toLowerCase();
    if (normalizedIcon.includes('sun') || normalizedIcon.includes('clear')) {
      return '☀';
    }
    if (normalizedIcon.includes('snow') || normalizedIcon.includes('sleet') || normalizedIcon.includes('ice')) {
      return '❄';
    }
    if (normalizedIcon.includes('thunder')) {
      return '⛈';
    }
    if (normalizedIcon.includes('rain') || normalizedIcon.includes('drizzle') || normalizedIcon.includes('shower')) {
      return '🌧';
    }
    if (normalizedIcon.includes('mist') || normalizedIcon.includes('fog') || normalizedIcon.includes('haze')) {
      return '🌫';
    }
    if (normalizedIcon.includes('cloud') || normalizedIcon.includes('overcast')) {
      return '☁';
    }

    return '◌';
  }

  trackByLocation(_: number, location: WeatherLocation): string {
    return location.id;
  }

  trackByHourlyPoint(_: number, point: HourlyForecastPoint): number {
    return point.timestamp;
  }

  trackByDailyPoint(_: number, point: DailyForecastPoint): number {
    return point.timestamp;
  }

  private registerConnectivity(): void {
    this.weatherStore.setOfflineMessage(
      navigator.onLine ? '' : 'You are offline. Codyza Weather will keep showing cached results until the connection returns.'
    );

    this.subscriptions.add(
      fromEvent(window, 'online').subscribe(() => {
        this.weatherStore.setOfflineMessage('');
        if (this.activeDashboard) {
          this.refreshWeather(true);
        }
      })
    );

    this.subscriptions.add(
      fromEvent(window, 'offline').subscribe(() => {
        this.weatherStore.setOfflineMessage(
          'You are offline. Codyza Weather will keep showing cached results until the connection returns.'
        );
      })
    );
  }

  private registerMapStateSync(): void {
    this.subscriptions.add(
      this.weatherStore.activeDashboard$.subscribe((dashboard) => {
        if (!dashboard) {
          return;
        }

        void this.initializeMap().then(() => {
          this.centerMapOnLocation(dashboard.location);
          this.syncMapMarkers();
        });
      })
    );

    this.subscriptions.add(
      combineLatest([
        this.weatherStore.favorites$,
        this.weatherStore.comparisonSnapshots$,
        this.weatherStore.activeDashboard$
      ]).subscribe(() => {
        void this.initializeMap().then(() => {
          this.syncMapMarkers();
        });
      })
    );
  }

  private startClock(): void {
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.weatherStore.setLocalTimestamp(Date.now());
      })
    );
  }

  private configureAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;

    if (!this.autoRefresh) {
      return;
    }

    this.autoRefreshSubscription = interval(environment.googleWeather.autoRefreshMs).subscribe(() => {
      if (this.activeDashboard && navigator.onLine) {
        this.refreshWeather(true);
      }
    });
  }

  private restoreState(): void {
    this.weatherStore.hydrateState({
      favorites: this.storage.getItem<WeatherLocation[]>(WEATHER_STORAGE_KEYS.favorites) || [],
      recentSearches: this.storage.getItem<WeatherLocation[]>(WEATHER_STORAGE_KEYS.recentSearches) || []
    });

    const settings = this.storage.getItem<PersistedSettings>(WEATHER_STORAGE_KEYS.settings);
    if (settings) {
      this.weatherStore.hydrateState({
        temperatureUnit: settings.temperatureUnit,
        measurementSystem: settings.measurementSystem,
        selectedMapLayer: settings.selectedMapLayer,
        autoRefresh: settings.autoRefresh
      });
    }

    const lastDashboard = this.storage.getItem<WeatherDashboard>(WEATHER_STORAGE_KEYS.lastDashboard);
    if (lastDashboard) {
      this.weatherStore.setDashboardView(lastDashboard, [...lastDashboard.warnings]);
    }

    const comparisonLocations = this.storage.getItem<WeatherLocation[]>(WEATHER_STORAGE_KEYS.comparison) || [];
    if (this.hasApiKey) {
      comparisonLocations.forEach((location) => this.addToComparison(location));
    }
  }

  private registerAutocompleteSearch(): void {
    this.subscriptions.add(
      this.searchInput$.pipe(
        debounceTime(250),
        distinctUntilChanged(),
      ).subscribe((query) => {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length >= 2) {
          this.weatherStore.searchLocations(normalizedQuery);
        }
      })
    );
  }

  private registerProtectedDashboardSync(): void {
    this.subscriptions.add(
      this.weatherStore.comparisonSnapshots$.pipe(
        distinctUntilChanged((left, right) =>
          left.length === right.length &&
          left.every((entry, index) => entry.location.id === right[index]?.location.id)
        )
      ).subscribe(() => {
        if (!this.observedComparisonSnapshots) {
          this.observedComparisonSnapshots = true;
          return;
        }

        this.scheduleProfileSync();
      })
    );

    this.subscriptions.add(
      this.profileSaveRequests$.pipe(
        debounceTime(400),
        switchMap(() => this.weatherService.saveUserProfile({
          favorites: this.favorites,
          comparisonLocations: this.comparisonSnapshots.map((entry) => entry.location),
          temperatureUnit: this.temperatureUnit,
          measurementSystem: this.measurementSystem,
          selectedMapLayer: this.selectedMapLayer,
          autoRefresh: this.autoRefresh,
          notificationPreferences: this.notificationPreferencesState
        }))
      ).subscribe({
        next: (profile) => {
          this.profileSyncInProgress = false;
          this.profileSyncStateMessage = 'Protected dashboard synced through the gateway.';
          this.applyProtectedDashboardProfile(profile);
        },
        error: (error: Error) => {
          this.profileSyncInProgress = false;
          this.profileSyncStateMessage = `Protected dashboard sync failed: ${error.message}`;
          this.weatherStore.appendWarningMessage(this.profileSyncStateMessage);
        }
      })
    );
  }

  private loadProtectedDashboard(): void {
    if (typeof window === 'undefined' || !window.localStorage.getItem('jwt_token')) {
      return;
    }

    this.profileSyncInProgress = true;
    this.profileSyncStateMessage = 'Loading protected dashboard...';
    this.weatherService.getUserProfile().subscribe({
      next: (profile) => {
        this.profileSyncInProgress = false;
        this.profileSyncStateMessage = 'Protected dashboard connected.';
        this.applyProtectedDashboardProfile(profile);
      },
      error: (error: Error) => {
        this.profileSyncInProgress = false;
        this.profileSyncStateMessage = `Protected dashboard could not be loaded: ${error.message}`;
        this.weatherStore.appendWarningMessage(this.profileSyncStateMessage);
        this.loadBackendSearchHistory();
      }
    });
  }

  private loadBackendSearchHistory(): void {
    this.weatherService.getSearchHistory().subscribe({
      next: (recentSearches) => {
        this.weatherStore.setRecentSearches(recentSearches);
      },
      error: (error: Error) => {
        this.weatherStore.appendWarningMessage(
          `Saved recent searches could not be loaded from the backend: ${error.message}`
        );
      }
    });
  }

  private applyProtectedDashboardProfile(profile: WeatherUserProfile): void {
    this.hydratingProfile = true;
    this.notificationPreferencesState = {
      ...defaultNotificationPreferences,
      ...profile.notificationPreferences
    };
    this.profileUpdatedAt = profile.updatedAt;
    this.weatherStore.hydrateState({
      favorites: profile.favorites,
      recentSearches: profile.recentSearches,
      temperatureUnit: profile.temperatureUnit,
      measurementSystem: profile.measurementSystem,
      selectedMapLayer: profile.selectedMapLayer,
      autoRefresh: profile.autoRefresh
    });
    this.weatherStore.setComparisonSnapshots([]);
    this.configureAutoRefresh();
    this.updateWeatherLayer();

    if (this.hasApiKey) {
      profile.comparisonLocations.forEach((location) => this.weatherStore.addComparisonLocation(location));
    }

    this.hydratingProfile = false;
  }

  private scheduleProfileSync(): void {
    if (!this.loggedInEmail || this.hydratingProfile) {
      return;
    }

    this.profileSyncInProgress = true;
    this.profileSyncStateMessage = 'Syncing protected dashboard...';
    this.profileSaveRequests$.next();
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapElement || this.map || !this.hasMapsApiKey) {
      return;
    }

    try {
      await loadGoogleMapsScript(environment.googleWeather.browserApiKey);
    } catch (error) {
      this.weatherStore.setErrorMessage(error instanceof Error ? error.message : 'Failed to load Google Maps.');
      return;
    }

    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    this.mapClickListener = this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const clickedLocation = event.latLng;
      if (!clickedLocation) {
        return;
      }

      if (!this.hasApiKey) {
        this.weatherStore.setApiMessage(
          'Configure the Nest weather API connection to enable click-to-load weather by coordinates.'
        );
        return;
      }

      this.weatherStore.loadDashboardFromCoordinates(clickedLocation.lat(), clickedLocation.lng(), 'map', false, true);
    });

    if (this.activeDashboard) {
      this.centerMapOnLocation(this.activeDashboard.location);
    }
    this.updateWeatherLayer();
    this.syncMapMarkers();
  }

  private centerMapOnLocation(location: WeatherLocation): void {
    if (!this.map) {
      return;
    }

    this.map.setCenter({ lat: location.lat, lng: location.lon });
    this.map.setZoom(this.initialMapCentered ? 7 : 5);
    this.initialMapCentered = true;
  }

  private updateWeatherLayer(): void {
    if (!this.map) {
      return;
    }

    this.map.overlayMapTypes.clear();
    this.weatherLayerOverlay = null;

    if (!this.supportsWeatherLayers) {
      return;
    }

    const tileTemplate = this.weatherService.weatherTileTemplate;
    if (!tileTemplate) {
      return;
    }

    this.weatherLayerOverlay = new google.maps.ImageMapType({
      name: this.weatherService.layerLabels[this.selectedMapLayer],
      opacity: 0.7,
      tileSize: new google.maps.Size(256, 256),
      getTileUrl: (coord, zoom) => tileTemplate
        .replace('{layer}', this.selectedMapLayer)
        .replace('{z}', String(zoom))
        .replace('{x}', String(coord.x))
        .replace('{y}', String(coord.y)),
    });

    this.map.overlayMapTypes.setAt(0, this.weatherLayerOverlay);
  }

  private syncMapMarkers(): void {
    if (!this.map) {
      return;
    }

    this.clearGoogleMarkers();

    if (this.activeDashboard) {
      this.createMarker(this.activeDashboard.location, '#4fd1ff', 9, `Live: ${this.activeDashboard.location.label}`);
    }

    this.favorites.forEach((location) => {
      this.createMarker(location, '#d93025', 7, `Pinned: ${location.label}`, 'pin');
    });

    this.comparisonSnapshots.forEach((snapshot) => {
      this.createMarker(snapshot.location, '#a78bfa', 6, `Compare: ${snapshot.location.label}`);
    });
  }

  private createMarker(
    location: WeatherLocation,
    color: string,
    radius: number,
    label: string,
    variant: MarkerVariant = 'circle'
  ): void {
    if (!this.map) {
      return;
    }

    const marker = new google.maps.Marker({
      map: this.map,
      position: { lat: location.lat, lng: location.lon },
      title: label,
      icon: variant === 'pin'
        ? undefined
        : {
            path: google.maps.SymbolPath.CIRCLE,
            scale: radius,
            fillColor: color,
            fillOpacity: 0.72,
            strokeColor: '#e2e8f0',
            strokeWeight: 2
          }
    });

    this.markers.push(marker);
  }

  private clearGoogleMarkers(): void {
    while (this.markers.length) {
      const marker = this.markers.pop();
      marker?.setMap(null);
    }
  }

  private isCurrentlyDaytime(): boolean {
    const dashboard = this.activeDashboardState();
    if (!dashboard) {
      return true;
    }

    const currentTimestamp = dashboard.current.observedAt;
    return currentTimestamp >= dashboard.current.sunrise && currentTimestamp < dashboard.current.sunset;
  }
}
