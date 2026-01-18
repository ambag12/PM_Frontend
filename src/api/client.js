import axios from 'axios';

const client = axios.create({
  baseURL: 'https://overall-calli-evantagesoft-7926b7a5.koyeb.app/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
