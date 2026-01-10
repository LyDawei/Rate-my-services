import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HealthCheckWrapper from './components/HealthCheckWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import RatingForm from './components/RatingForm';
import BaymaxFace from './components/BaymaxFace';
import BackgroundBlobs from './components/BackgroundBlobs';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

/**
 * Public Home Page - Rating submission form
 */
function HomePage() {
  return (
    <div className="app">
      <BackgroundBlobs count={3} animate={false} />

      <header className="app-header glass-panel">
        <div className="baymax-icon">
          <BaymaxFace emotion="happy" size={100} animate={false} />
        </div>
        <h1>Baymax IT Care</h1>
        <p className="tagline">
          "Hello. I am Baymax, your personal IT healthcare companion."
          <br />
          <span className="subtitle">I was alerted to the need for technical assistance.</span>
        </p>
      </header>

      <main className="app-main">
        <div className="main-content">
          <div className="form-section">
            <RatingForm />
          </div>
        </div>
      </main>

      <footer className="app-footer glass-panel">
        <div className="footer-content">
          <BaymaxFace emotion="happy" size={40} animate={false} />
          <p>
            "I cannot deactivate until you say you are satisfied with your care."
            <br />
            <span className="footer-note">Ba-la-la-la-la</span>
          </p>
        </div>
        <Link to="/admin" className="admin-link">
          Admin Portal
        </Link>
      </footer>
    </div>
  );
}

/**
 * Main App with routing
 */
function App() {
  return (
    <HealthCheckWrapper>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Redirect /admin to dashboard (will redirect to login if not authenticated) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </HealthCheckWrapper>
  );
}

export default App;
