"use client";
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 1000, enabled = true) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) { setValue(target); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, enabled]);

  return value;
}
