import { MeasurementSystem, TemperatureUnit } from '../../../models/weather.models';

export interface WeatherPreferencesState {
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  autoRefresh: boolean;
}

export const initialWeatherPreferencesState: WeatherPreferencesState = {
  temperatureUnit: 'celsius',
  measurementSystem: 'metric',
  autoRefresh: true
};
