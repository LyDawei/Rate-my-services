import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BaymaxFace from './BaymaxFace';
import BackgroundBlobs from './BackgroundBlobs';

/**
 * MaintenanceMode Component
 * Displays a full-page maintenance message when backend is unavailable
 */
function MaintenanceMode({
  isLoading = false,
  onRetry,
  lastCheckTime,
  consecutiveFailures = 0
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [, setTick] = useState(0);

  // Update "last checked" display every 10 seconds
  useEffect(() => {
    if (!lastCheckTime) return;
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    await onRetry?.();
    setIsRetrying(false);
  };

  const formatLastCheck = () => {
    if (!lastCheckTime) return null;
    const seconds = Math.floor((new Date() - lastCheckTime) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="maintenance-mode">
      <BackgroundBlobs count={3} animate={true} />

      <div className="maintenance-container glass-panel">
        <div className="maintenance-icon">
          <BaymaxFace
            emotion={isLoading || isRetrying ? "thinking" : "sad"}
            size={120}
            animate={true}
          />
        </div>

        <h1 className="maintenance-title">
          {isLoading ? "Initializing Care Systems..." : "I Am Experiencing Technical Difficulties"}
        </h1>

        <p className="maintenance-message">
          {isLoading ? (
            "Please wait while I connect to my care database..."
          ) : (
            <>
              I cannot connect to my healthcare companion database at this time.
              <br />
              <span className="maintenance-subtitle">
                My systems will automatically attempt to reconnect.
              </span>
            </>
          )}
        </p>

        {!isLoading && (
          <div className="maintenance-status">
            <div className="status-indicator">
              <span className="status-dot pulse" />
              <span className="status-text">
                Attempting to reconnect every 10 seconds...
              </span>
            </div>

            {lastCheckTime && (
              <p className="last-check">
                Last checked: {formatLastCheck()}
              </p>
            )}

            {consecutiveFailures > 3 && (
              <p className="extended-outage">
                Extended outage detected. Please contact your IT administrator
                if this persists.
              </p>
            )}
          </div>
        )}

        <button
          className="maintenance-retry-btn"
          onClick={handleRetry}
          disabled={isRetrying || isLoading}
        >
          {isRetrying ? (
            <>
              <BaymaxFace emotion="thinking" size={20} animate={false} />
              <span>Checking connection...</span>
            </>
          ) : (
            <>
              <span className="retry-icon">↻</span>
              <span>Try Again Now</span>
            </>
          )}
        </button>

        <p className="maintenance-footer">
          "I will notify you when my systems are back online."
          <br />
          <span className="footer-note">Ba-la-la-la-la... *low power mode*</span>
        </p>
      </div>
    </div>
  );
}

MaintenanceMode.propTypes = {
  isLoading: PropTypes.bool,
  onRetry: PropTypes.func,
  lastCheckTime: PropTypes.instanceOf(Date),
  consecutiveFailures: PropTypes.number
};

export default MaintenanceMode;
