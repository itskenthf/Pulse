export interface WeatherSettings {
  label: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  temperatureC: number;
  windSpeedKmh: number;
  description: string;
  location: string;
  observedAt: string;
}
