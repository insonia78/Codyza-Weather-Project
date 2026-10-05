import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { provideStore, provideState } from '@ngrx/store';

import { AppComponent } from './app/app.component';
import { JwtTokenInterceptor } from './app/interceptors/jwt-token.interceptor';
import { WeatherEffects } from './app/store/weather/weather.effects';
import { weatherFeature } from './app/store/weather/weather.feature';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtTokenInterceptor,
      multi: true,
    },
    provideStore(),
    provideState(weatherFeature),
    provideEffects(WeatherEffects)
  ]
})
  .catch(err => console.error(err));
