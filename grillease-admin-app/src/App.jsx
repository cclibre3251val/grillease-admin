import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import client from './lib/appwrite.js';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/DashboardLayout';
import OrderManager from './components/OrderManager';
import './App.css';

function App() {
  console.log('📱 App component rendering...');
  console.log('📍 Current URL:', window.location.pathname);

  useEffect(() => {
    console.log('Pinging Appwrite...');
    client.ping()
      .then(response => {
        console.log('Appwrite ping successful:', response);
      })
      .catch(error => {
        console.error('Appwrite ping failed:', error);
      });
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;