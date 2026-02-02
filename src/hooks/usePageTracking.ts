import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analytics';

export function usePageTracking(userId?: string) {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Only track if the path has changed
    if (previousPathRef.current === location.pathname) {
      return;
    }

    previousPathRef.current = location.pathname;
    trackPageView(location.pathname, userId);
  }, [location.pathname, userId]);
}
