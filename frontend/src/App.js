import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Alerts from './pages/Alerts';
import Rules from './pages/Rules';
import { getSessionFromUrl, clearSessionFromUrl, createSession, getCurrentUser } from './utils/auth';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const sessionId = getSessionFromUrl();

      if (sessionId) {
        setAuthProcessing(true);
        try {
          const data = await createSession(sessionId);
          setUser(data.user);
          clearSessionFromUrl();
        } catch (error) {
          console.error('Auth failed:', error);
        } finally {
          setAuthProcessing(false);
          setLoading(false);
        }
      } else {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  if (loading || authProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />}
          />
          <Route
            path="/transactions"
            element={user ? <Transactions user={user} setUser={setUser} /> : <Navigate to="/" />}
          />
          <Route
            path="/alerts"
            element={user ? <Alerts user={user} setUser={setUser} /> : <Navigate to="/" />}
          />
          <Route
            path="/rules"
            element={user ? <Rules user={user} setUser={setUser} /> : <Navigate to="/" />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;