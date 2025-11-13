import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AUTH_REDIRECT_URL = `${window.location.origin}/dashboard`;
export const EMERGENT_AUTH_URL = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(AUTH_REDIRECT_URL)}`;

export const getSessionFromUrl = () => {
  const hash = window.location.hash;
  if (hash && hash.includes('session_id=')) {
    const sessionId = hash.split('session_id=')[1].split('&')[0];
    return sessionId;
  }
  return null;
};

export const clearSessionFromUrl = () => {
  window.history.replaceState(null, '', window.location.pathname);
};

export const createSession = async (sessionId) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/session`,
      { session_id: sessionId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Session creation failed:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  try {
    await axios.post(`${API_URL}/api/auth/logout`, {}, {
      withCredentials: true
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const getAuthToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('session_token='))
    ?.split('=')[1];
};