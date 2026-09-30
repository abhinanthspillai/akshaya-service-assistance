import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  centre_id?: string;
  approval_status?: string;
}