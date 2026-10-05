import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable()
export class JwtTokenInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = typeof window === 'undefined' ? null : window.localStorage.getItem('jwt_token');
    const gatewayApiKey = environment.googleWeather.gatewayApiKey.trim();
    const headers: Record<string, string> = {};

    if (gatewayApiKey) {
      headers['apikey'] = gatewayApiKey;
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (Object.keys(headers).length === 0) {
      return next.handle(request);
    }

    return next.handle(
      request.clone({
        setHeaders: headers,
      }),
    );
  }
}
