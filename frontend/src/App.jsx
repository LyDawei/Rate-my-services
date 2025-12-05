import { useState } from 'react';
import RatingForm from './components/RatingForm';
import RecentRatings from './components/RecentRatings';
import StatsDisplay from './components/StatsDisplay';
import './App.css';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRatingSubmitted = () => {
    // Trigger refresh of ratings and stats
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧙‍♂️ Rate My IT Services</h1>
        <p className="tagline">
          Your friendly neighborhood one-person IT department
          <br />
          <span className="subtitle">Now accepting gratitude and constructive roasts</span>
        </p>
      </header>

      <main className="app-main">
        <div className="main-content">
          <div className="form-section">
            <RatingForm onRatingSubmitted={handleRatingSubmitted} />
          </div>

          <div className="sidebar">
            <StatsDisplay refreshTrigger={refreshKey} />
            <RecentRatings refreshTrigger={refreshKey} />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Made with ☕ and questionable amounts of caffeine
          <br />
          <span className="footer-note">Remember: Have you tried turning it off and on again?</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
