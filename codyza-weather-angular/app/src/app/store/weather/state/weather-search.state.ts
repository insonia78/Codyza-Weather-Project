import { WeatherLocation } from '../../../models/weather.models';

export interface WeatherSearchState {
  query: string;
  results: WeatherLocation[];
  loading: boolean;
}

export const initialWeatherSearchState: WeatherSearchState = {
  query: '',
  results: [],
  loading: false
};
