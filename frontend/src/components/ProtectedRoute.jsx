/**
 * ProtectedRoute Component
 * Wraps routes that require admin authentication
 */

import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import BaymaxFace from './BaymaxFace';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <BaymaxFace emotion="thinking" size={80} />
        <p>Verifying administrator credentials...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};

export default ProtectedRoute;
