import axios from 'axios';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

const API_BASE = `${process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000'}/api/auth`;
const requestConfig = { withCredentials: true as const };

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await axios.post(`${API_BASE}/login`, payload, requestConfig);
  return response.data.user;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const response = await axios.post(`${API_BASE}/register`, payload, requestConfig);
  return response.data.user;
}

export async function me(): Promise<AuthUser> {
  const response = await axios.get(`${API_BASE}/me`, requestConfig);
  return response.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${API_BASE}/logout`, {}, requestConfig);
}

