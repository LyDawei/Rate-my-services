import { useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Confetti Celebration Component
 * Creates a burst of confetti particles for celebration moments
 * Respects user's prefers-reduced-motion setting
 */

const COLORS = [
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Salmon
  '#AA96DA', // Lavender
  '#FF9F9F', // Light red (Baymax)
  '#FCE38A', // Light yellow
];

const PARTICLE_COUNT = 30; // Reduced for better performance

function Confetti({ active, duration = 3000, onComplete }) {
  const [particles, setParticles] = useState([]);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const createParticles = useCallback(() => {
    const newParticles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20, // Start near center
        y: 50,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 15,
        speedY: Math.random() * -15 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
        delay: Math.random() * 0.2, // Calculate delay at creation time, not render
      });
    }
    return newParticles;
  }, []);

  useEffect(() => {
    if (active && !prefersReducedMotion) {
      setParticles(createParticles());

      const timer = setTimeout(() => {
        setParticles([]);
        if (onComplete) onComplete();
      }, duration);

      return () => clearTimeout(timer);
    } else if (active && prefersReducedMotion) {
      // For reduced motion, just call onComplete after a brief moment
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, duration, createParticles, onComplete, prefersReducedMotion]);

  // Don't render anything if user prefers reduced motion or not active
  if (!active || particles.length === 0 || prefersReducedMotion) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`confetti-particle confetti-${particle.shape}`}
          style={{
            '--start-x': `${particle.x}%`,
            '--start-y': `${particle.y}%`,
            '--speed-x': particle.speedX,
            '--speed-y': particle.speedY,
            '--rotation': `${particle.rotation}deg`,
            '--rotation-speed': particle.rotationSpeed,
            '--size': `${particle.size}px`,
            '--color': particle.color,
            '--delay': `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

Confetti.propTypes = {
  active: PropTypes.bool.isRequired,
  duration: PropTypes.number,
  onComplete: PropTypes.func
};

export default Confetti;
