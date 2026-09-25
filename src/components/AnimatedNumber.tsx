import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

/**
 * Renders a number that smoothly counts from its previous value to the new one.
 * On first mount, counts up from 0.
 */
export default function AnimatedNumber({ value, duration = 900, className = '', suffix = '' }: Props) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}