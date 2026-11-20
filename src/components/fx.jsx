import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

// Number that counts up from 0 when it scrolls into view.
export function CountUp({ value, duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setShown(value);
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [inView, value, duration, reduce]);

  return <span ref={ref}>{shown}</span>;
}

// Endless horizontal ticker. Children are rendered twice so the loop is seamless.
export function Marquee({ children, speed = 40, reverse = false, className = '' }) {
  return (
    <div className={`marquee ${className}`}>
      <div className="marquee-track" style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

// Feeds the cursor position into CSS variables (--mx, --my in %) for spotlight / glow effects.
export function useSpotlight() {
  const ref = useRef(null);
  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return { ref, onMouseMove };
}
