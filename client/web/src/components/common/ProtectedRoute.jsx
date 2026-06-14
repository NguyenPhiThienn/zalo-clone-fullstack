import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { auth } = useAuthStore();

  if (!auth?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && auth.role !== 'ADMIN') {
    return <Navigate to="/chat" replace />;
  }

  return children;
}
