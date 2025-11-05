'use client';

import { useEffect } from 'react';

export default function WebVitalsLogger() {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const log = (name: string, value: number) => {
        // Log to console; wire to your analytics here if desired
        // Round for readability
        console.log(`[web-vitals] ${name}:`, Math.round(value * 100) / 100);
      };

      const poLCP = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        if (last) log('LCP', last.renderTime || last.loadTime || last.startTime || 0);
      });
      poLCP.observe({ type: 'largest-contentful-paint', buffered: true as any });

      const poCLS = new PerformanceObserver((list) => {
        let cls = 0;
        for (const e of list.getEntries() as any) {
          if (!e.hadRecentInput) cls += e.value || 0;
        }
        log('CLS', cls);
      });
      poCLS.observe({ type: 'layout-shift', buffered: true as any });

      const poINP = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        const last = entries[entries.length - 1];
        if (last) log('INP', last.duration || 0);
      });
      poINP.observe({ type: 'event', buffered: true as any });

      return () => {
        poLCP.disconnect();
        poCLS.disconnect();
        poINP.disconnect();
      };
    } catch {
      // Ignore if not supported
    }
  }, []);

  return null;
}


