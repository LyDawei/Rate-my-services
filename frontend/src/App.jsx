import RatingForm from './components/RatingForm';
// TODO: [ADMIN FEATURE] These components should be moved to an admin dashboard in a future branch.
// The StatsDisplay and RecentRatings components are not intended for end-users submitting feedback.
// They should only be accessible to administrators who need to view and analyze the feedback data.
// See: StatsDisplay.jsx, RecentRatings.jsx - keep these components, just don't render them here.
// eslint-disable-next-line no-unused-vars
import RecentRatings from './components/RecentRatings';
// eslint-disable-next-line no-unused-vars
import StatsDisplay from './components/StatsDisplay';
import BaymaxFace from './components/BaymaxFace';
import BackgroundBlobs from './components/BackgroundBlobs';
import './App.css';

function App() {
  return (
    <div className="app">
      {/* Background blobs - animations DISABLED for performance */}
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

          {/*
            TODO: [ADMIN FEATURE] Move to admin dashboard in future branch
            The sidebar containing StatsDisplay and RecentRatings should not be visible
            to regular users. Create an /admin route with authentication to display:
            - <StatsDisplay refreshTrigger={refreshKey} />
            - <RecentRatings refreshTrigger={refreshKey} />
          */}
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
      </footer>
    </div>
  );
}

export default App;
