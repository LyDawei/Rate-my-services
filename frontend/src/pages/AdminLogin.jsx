/**
 * AdminLogin Page
 * Login form for admin dashboard access
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BaymaxFace from '../components/BaymaxFace';
import BackgroundBlobs from '../components/BackgroundBlobs';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear errors when inputs change
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!username.trim()) {
      setLocalError('Please enter your username.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setLocalError('');

    const result = await login(username.trim(), password);

    setIsSubmitting(false);

    if (result.success) {
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  };

  const displayError = localError || authError;

  return (
    <div className="admin-login-page">
      <BackgroundBlobs count={3} animate={false} />

      <div className="login-container glass-panel">
        <div className="login-header">
          <BaymaxFace
            emotion={displayError ? 'concerned' : isSubmitting ? 'thinking' : 'neutral'}
            size={80}
          />
          <h1>Admin Portal</h1>
          <p className="login-subtitle">
            "Please identify yourself for administrator access."
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {displayError && (
            <div className="login-error" role="alert">
              <span className="error-icon">!</span>
              {displayError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleInputChange(setUsername)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <BaymaxFace emotion="thinking" size={20} />
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/" className="back-link">
            Return to Feedback Form
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
