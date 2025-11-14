import axios from 'axios';

// Configure axios to always include credentials (cookies)
axios.defaults.withCredentials = true;

// Do NOT auto-redirect on 401 - let components handle auth errors
export default axios;
