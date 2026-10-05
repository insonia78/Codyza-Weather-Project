import { ChartSeries, WeatherDashboard } from '../../../models/weather.models';

export interface WeatherDashboardState {
  activeDashboard: WeatherDashboard | null;
  loadingWeather: boolean;
  refreshInProgress: boolean;
  errorMessage: string;
  staleMessage: string;
  apiMessage: string;
  warningMessages: string[];
  localTimestamp: number;
  temperatureChart: ChartSeries | null;
  precipitationChart: ChartSeries | null;
  windChart: ChartSeries | null;
}

export const initialWeatherDashboardState: WeatherDashboardState = {
  activeDashboard: null,
  loadingWeather: false,
  refreshInProgress: false,
  errorMessage: '',
  staleMessage: '',
  apiMessage: '',
  warningMessages: [],
  localTimestamp: Date.now(),
  temperatureChart: null,
  precipitationChart: null,
  windChart: null
};
