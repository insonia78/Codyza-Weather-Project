import { MapLayerKey } from '../../../models/weather.models';

export interface WeatherMapState {
  selectedMapLayer: MapLayerKey;
}

export const initialWeatherMapState: WeatherMapState = {
  selectedMapLayer: 'precipitation_new'
};
