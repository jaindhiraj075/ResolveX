import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 600,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0 : value;
  const isPercent = typeof value === 'string' && value.includes('%');
  const actualSuffix = isPercent && !suffix ? '%' : suffix;

  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || duration <= 0) {
      setCount(numericValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = numericValue;

    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quartic curve for quick deceleration
      const easeOutProgress = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutProgress;

      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [numericValue, duration]);

  const formattedCount = Number.isInteger(numericValue)
    ? Math.round(count)
    : count.toFixed(1);

  return (
    <span className={`inline-block tabular-nums font-semibold tracking-tight ${className}`}>
      {prefix}
      {formattedCount}
      {actualSuffix}
    </span>
  );
};

export default AnimatedCounter;
