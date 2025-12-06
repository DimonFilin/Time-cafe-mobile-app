import axios from 'axios';

const SHARED_API_URL = process.env.EXPO_PUBLIC_SHARED_API_URL || 'http://localhost:3000';
const CAFE_API_URL = process.env.EXPO_PUBLIC_CAFE_API_URL || 'http://localhost:4000';

export const sharedApi = axios.create({
  baseURL: SHARED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const cafeApi = axios.create({
  baseURL: CAFE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

sharedApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

cafeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});




