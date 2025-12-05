import { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Background Blobs Component
 * Renders animated gradient blobs for glassmorphic background effect
 *
 * Features:
 * - Soft, animated gradient shapes using Baymax theme colors
 * - CSS-driven animations for smooth performance
 * - Respects prefers-reduced-motion accessibility setting
 * - Fixed positioning behind all content (z-index: -1)
 * - Multiple blob variations for visual depth
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of blobs to render (1-8)
 * @param {boolean} [props.animate=true] - Enable/disable blob animations
 */
function BackgroundBlobs({ count = 3, animate = true }) {
  // Check if user prefers reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Disable animations if user prefers reduced motion
  const shouldAnimate = animate && !prefersReducedMotion;

  // Blob configurations with Baymax-themed colors
  const blobConfigs = useMemo(() => [
    {
      id: 1,
      gradient: 'radial-gradient(circle at 30% 50%, rgba(255, 111, 97, 0.15), rgba(229, 57, 53, 0.05))',
      size: '600px',
      top: '10%',
      left: '10%',
      animationDuration: '25s',
      animationDelay: '0s',
    },
    {
      id: 2,
      gradient: 'radial-gradient(circle at 70% 50%, rgba(255, 182, 193, 0.12), rgba(255, 228, 225, 0.04))',
      size: '500px',
      top: '60%',
      left: '70%',
      animationDuration: '30s',
      animationDelay: '-5s',
    },
    {
      id: 3,
      gradient: 'radial-gradient(circle at 50% 50%, rgba(229, 57, 53, 0.08), rgba(255, 235, 238, 0.03))',
      size: '450px',
      top: '40%',
      left: '40%',
      animationDuration: '28s',
      animationDelay: '-10s',
    },
    {
      id: 4,
      gradient: 'radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.2), rgba(250, 250, 250, 0.05))',
      size: '550px',
      top: '20%',
      left: '75%',
      animationDuration: '32s',
      animationDelay: '-15s',
    },
    {
      id: 5,
      gradient: 'radial-gradient(circle at 60% 40%, rgba(255, 152, 143, 0.1), rgba(255, 205, 210, 0.04))',
      size: '480px',
      top: '70%',
      left: '15%',
      animationDuration: '27s',
      animationDelay: '-20s',
    },
    {
      id: 6,
      gradient: 'radial-gradient(circle at 50% 50%, rgba(244, 143, 177, 0.09), rgba(248, 187, 208, 0.03))',
      size: '420px',
      top: '5%',
      left: '50%',
      animationDuration: '29s',
      animationDelay: '-12s',
    },
    {
      id: 7,
      gradient: 'radial-gradient(circle at 35% 45%, rgba(255, 111, 97, 0.11), rgba(255, 235, 238, 0.04))',
      size: '380px',
      top: '85%',
      left: '60%',
      animationDuration: '26s',
      animationDelay: '-8s',
    },
    {
      id: 8,
      gradient: 'radial-gradient(circle at 65% 55%, rgba(255, 205, 210, 0.13), rgba(255, 245, 245, 0.05))',
      size: '520px',
      top: '50%',
      left: '5%',
      animationDuration: '31s',
      animationDelay: '-18s',
    },
  ], []);

  // Limit blob count to valid range
  const validCount = Math.min(Math.max(1, count), blobConfigs.length);
  const activeBlobs = blobConfigs.slice(0, validCount);

  return (
    <div
      className="background-blobs"
      aria-hidden="true"
      role="presentation"
    >
      {activeBlobs.map((blob) => (
        <div
          key={blob.id}
          className={`blob blob-${blob.id} ${shouldAnimate ? 'animate' : ''}`}
          style={{
            '--blob-gradient': blob.gradient,
            '--blob-size': blob.size,
            '--blob-top': blob.top,
            '--blob-left': blob.left,
            '--blob-duration': blob.animationDuration,
            '--blob-delay': blob.animationDelay,
          }}
        />
      ))}
    </div>
  );
}

BackgroundBlobs.propTypes = {
  count: PropTypes.number,
  animate: PropTypes.bool,
};

export default BackgroundBlobs;
