import axios from 'axios';
import { oktaAuth } from './oktaConfig';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach the Okta access token to every request
client.interceptors.request.use(async (config) => {
  const tokenManager = oktaAuth.tokenManager;
  const accessToken = await tokenManager.get('accessToken');
  if (accessToken && 'accessToken' in accessToken) {
    config.headers.Authorization = `Bearer ${accessToken.accessToken}`;
  }
  return config;
});

export default client;
