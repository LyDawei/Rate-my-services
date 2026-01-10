import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { API_URL } from '../config';
import MaintenanceMode from './MaintenanceMode';

// Polling intervals
const HEALTHY_POLL_INTERVAL = 30000;   // 30 seconds when healthy
const UNHEALTHY_POLL_INTERVAL = 10000; // 10 seconds when in maintenance

/**
 * HealthCheckWrapper Component
 * Monitors backend health and displays maintenance mode when unavailable
 */
function HealthCheckWrapper({ children }) {
  const [isHealthy, setIsHealthy] = useState(null); // null = checking, true = healthy, false = unhealthy
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const pollIntervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${API_URL}/health`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsHealthy(true);
          setConsecutiveFailures(0);
          setLastCheckTime(new Date());
          return true;
        }
      }

      // Response not OK or success: false
      setIsHealthy(false);
      setConsecutiveFailures(prev => prev + 1);
      setLastCheckTime(new Date());
      return false;
    } catch (error) {
      // Network error, timeout, or other failure
      console.error('Health check failed:', error);
      setIsHealthy(false);
      setConsecutiveFailures(prev => prev + 1);
      setLastCheckTime(new Date());
      return false;
    }
  }, []);

  // Initial health check
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Set up polling based on current health state
  useEffect(() => {
    if (isHealthy === null) return; // Still doing initial check

    const interval = isHealthy ? HEALTHY_POLL_INTERVAL : UNHEALTHY_POLL_INTERVAL;

    pollIntervalRef.current = setInterval(() => {
      checkHealth();
    }, interval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isHealthy, checkHealth]);

  // Show loading state during initial check
  if (isHealthy === null) {
    return (
      <MaintenanceMode
        isLoading={true}
        onRetry={checkHealth}
      />
    );
  }

  // Show maintenance mode when unhealthy
  if (!isHealthy) {
    return (
      <MaintenanceMode
        isLoading={false}
        onRetry={checkHealth}
        lastCheckTime={lastCheckTime}
        consecutiveFailures={consecutiveFailures}
      />
    );
  }

  // Render app when healthy
  return children;
}

HealthCheckWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

export default HealthCheckWrapper;
