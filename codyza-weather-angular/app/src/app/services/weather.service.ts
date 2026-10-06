import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  MapLayerKey,
  NotificationPreferences,
  WeatherDashboard,
  WeatherLocation,
  WeatherUserProfile
} from '../models/weather.models';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  readonly providerName = 'Google Maps Weather API';
  readonly supportsWeatherLayers = true;
  readonly layerLabels: Record<MapLayerKey, string> = {
    clouds_new: 'Cloud cover',
    precipitation_new: 'Precipitation',
    temp_new: 'Temperature',
    wind_new: 'Wind'
  };

  private readonly apiBaseUrl = environment.googleWeather.apiBaseUrl.replace(/\/+$/, '');
  private readonly gatewayBaseUrl = environment.googleWeather.gatewayBaseUrl.replace(/\/+$/, '');

  constructor(private readonly http: HttpClient) {}

  get apiKeyConfigured(): boolean {
    return Boolean(this.apiBaseUrl);
  }

  get weatherTileTemplate(): string {
    return `${this.apiBaseUrl}/map-layers/{layer}/{z}/{x}/{y}`;
  }

  searchLocations(query: string): Observable<WeatherLocation[]> {
    return this.http.get<WeatherLocation[]>(`${this.apiBaseUrl}/search`, {
      params: { query }
    }).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Location search', error))
    );
  }

  reverseGeocode(lat: number, lon: number, source: WeatherLocation['source']): Observable<WeatherLocation[]> {
    return this.http.get<WeatherLocation[]>(`${this.apiBaseUrl}/reverse`, {
      params: {
        lat,
        lon,
        source
      }
    }).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Reverse geocoding', error))
    );
  }

  getDashboard(location: WeatherLocation, forceRefresh = false): Observable<WeatherDashboard> {
    return this.http.post<WeatherDashboard>(`${this.apiBaseUrl}/dashboard`, {
      location,
      forceRefresh
    }).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Weather dashboard', error))
    );
  }

  getSearchHistory(): Observable<WeatherLocation[]> {
    return this.http.get<WeatherLocation[]>(`${this.apiBaseUrl}/search-history`).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Search history', error))
    );
  }

  saveSearchHistory(location: WeatherLocation, queryText: string): Observable<WeatherLocation[]> {
    return this.http.post<WeatherLocation[]>(`${this.apiBaseUrl}/search-history`, {
      location,
      queryText
    }).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Saving search history', error))
    );
  }

  clearSearchHistory(): Observable<{ cleared: boolean }> {
    return this.http.delete<{ cleared: boolean }>(`${this.apiBaseUrl}/search-history`).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Clearing search history', error))
    );
  }

  getUserProfile(): Observable<WeatherUserProfile> {
    return this.http.get<WeatherUserProfile>(`${this.apiBaseUrl}/profile`).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Protected dashboard', error))
    );
  }

  saveUserProfile(profile: {
    favorites: WeatherLocation[];
    comparisonLocations: WeatherLocation[];
    temperatureUnit: WeatherUserProfile['temperatureUnit'];
    measurementSystem: WeatherUserProfile['measurementSystem'];
    selectedMapLayer: WeatherUserProfile['selectedMapLayer'];
    autoRefresh: boolean;
    notificationPreferences: NotificationPreferences;
  }): Observable<WeatherUserProfile> {
    return this.http.put<WeatherUserProfile>(`${this.apiBaseUrl}/profile`, profile).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Saving protected dashboard settings', error))
    );
  }

  logout(): Observable<{ revoked: boolean }> {
    return this.http.post<{ revoked: boolean }>(`${this.gatewayBaseUrl}/auth/logout`, {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Logout', error))
    );
  }

  deactivateAccount(): Observable<{ deleted: boolean; email: string }> {
    return this.http.post<{ deleted: boolean; email: string }>(`${this.gatewayBaseUrl}/accounts/deactivate`, {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Account deactivation', error))
    );
  }

  private handleBackendError(surfaceName: string, error: HttpErrorResponse): Observable<never> {
    const backendMessage = typeof error.error?.message === 'string'
      ? error.error.message
      : null;

    if (backendMessage) {
      return throwError(() => new Error(backendMessage));
    }

    return throwError(() => new Error(
      `${surfaceName} could not be loaded (${error.status || 0} ${error.statusText || 'Request failed'}).`
    ));
  }
}
