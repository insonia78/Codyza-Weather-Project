import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { MapLayerKey, WeatherDashboard, WeatherLocation } from '../models/weather.models';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  readonly providerName = 'Google Maps Weather API';
  readonly supportsWeatherLayers = false;
  readonly layerLabels: Record<MapLayerKey, string> = {
    clouds_new: 'Cloud cover',
    precipitation_new: 'Precipitation radar',
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
    return '';
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

  logout(): Observable<{ revoked: boolean }> {
    return this.http.post<{ revoked: boolean }>(`${this.gatewayBaseUrl}/auth/logout`, {}).pipe(
      catchError((error: HttpErrorResponse) => this.handleBackendError('Logout', error))
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
