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
        <div className="baymax-icon">🤖</div>
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
          "I cannot deactivate until you say you are satisfied with your care."
          <br />
          <span className="footer-note">Ba-la-la-la-la 👊</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
