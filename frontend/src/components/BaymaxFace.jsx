import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Baymax Face SVG Component
 * Displays Baymax's iconic face with different emotional states
 * Based on Big Hero 6's Baymax character design
 *
 * @param {Object} props
 * @param {'neutral'|'happy'|'concerned'|'thinking'|'celebrating'|'sad'} props.emotion - Emotional state
 * @param {number} [props.size=80] - Size in pixels
 * @param {boolean} [props.animate=true] - Whether to enable blinking animation
 * @param {string} [props.className=''] - Additional CSS classes
 */

// Emotion states for Baymax
// Performance: Increased blink rates 10x to reduce React re-renders
const EMOTIONS = {
  neutral: { eyeY: 50, eyeCurve: 0, blinkRate: 30000 },
  happy: { eyeY: 52, eyeCurve: 8, blinkRate: 40000 },
  concerned: { eyeY: 48, eyeCurve: -4, blinkRate: 20000 },
  thinking: { eyeY: 50, eyeCurve: 0, blinkRate: 15000 },
  celebrating: { eyeY: 54, eyeCurve: 12, blinkRate: 50000 },
  sad: { eyeY: 46, eyeCurve: -8, blinkRate: 25000 },
};

function BaymaxFace({
  emotion = 'neutral',
  size = 80,
  animate = true,
  className = ''
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  const emotionConfig = EMOTIONS[emotion] || EMOTIONS.neutral;

  // Blinking animation
  useEffect(() => {
    if (!animate) return;

    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };

    const interval = setInterval(blink, emotionConfig.blinkRate);
    return () => clearInterval(interval);
  }, [animate, emotionConfig.blinkRate]);

  const eyeHeight = isBlinking ? 2 : 16;
  const eyeY = emotionConfig.eyeY;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`baymax-face ${className} emotion-${emotion}`}
      role="img"
      aria-label={`Baymax face showing ${emotion} emotion`}
    >
      {/* Head/body outline */}
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="42"
        fill="white"
        stroke="#e0e0e0"
        strokeWidth="2"
        className="baymax-head"
      />

      {/* Left eye */}
      <ellipse
        cx="35"
        cy={eyeY}
        rx="8"
        ry={eyeHeight}
        fill="#1a1a1a"
        className="baymax-eye baymax-eye-left"
        style={{
          transform: `rotate(${emotionConfig.eyeCurve}deg)`,
          transformOrigin: '35px 50px',
          transition: 'all 0.2s ease'
        }}
      />

      {/* Right eye */}
      <ellipse
        cx="65"
        cy={eyeY}
        rx="8"
        ry={eyeHeight}
        fill="#1a1a1a"
        className="baymax-eye baymax-eye-right"
        style={{
          transform: `rotate(${-emotionConfig.eyeCurve}deg)`,
          transformOrigin: '65px 50px',
          transition: 'all 0.2s ease'
        }}
      />

      {/* Connecting line between eyes */}
      <line
        x1="43"
        y1={eyeY}
        x2="57"
        y2={eyeY}
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
        className="baymax-line"
      />

      {/* Celebration sparkles (only shown when celebrating) */}
      {emotion === 'celebrating' && (
        <g className="celebration-sparkles" aria-hidden="true">
          <circle cx="20" cy="25" r="2" fill="#FFD700" className="sparkle sparkle-1" />
          <circle cx="80" cy="25" r="2" fill="#FFD700" className="sparkle sparkle-2" />
          <circle cx="15" cy="45" r="1.5" fill="#FF69B4" className="sparkle sparkle-3" />
          <circle cx="85" cy="45" r="1.5" fill="#FF69B4" className="sparkle sparkle-4" />
          <circle cx="25" cy="75" r="2" fill="#87CEEB" className="sparkle sparkle-5" />
          <circle cx="75" cy="75" r="2" fill="#87CEEB" className="sparkle sparkle-6" />
        </g>
      )}
    </svg>
  );
}

BaymaxFace.propTypes = {
  emotion: PropTypes.oneOf(['neutral', 'happy', 'concerned', 'thinking', 'celebrating', 'sad']),
  size: PropTypes.number,
  animate: PropTypes.bool,
  className: PropTypes.string
};

export default BaymaxFace;
