export const environment = {
  production: true,
  rootAppUrl: 'https://codyza-weather-project-17oc.vercel.app/',
  googleWeather: {
    gatewayBaseUrl: 'https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway',
    apiBaseUrl: 'https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway/weather',
    gatewayApiKey: 'sb_publishable_oqhb4AzpVOU8xiHCahPV2A_RiTdjh6F',
    browserApiKey: 'AIzaSyB2-nsabDHy7b5PKAsTA3V2z7q9_Xuoyis',
    autoRefreshMs: 10 * 60 * 1000
  }
};
