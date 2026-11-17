import { useEffect, useState } from 'react';

const screens = new Set(['home', 'scan', 'released', 'rejected', 'sync', 'shipments', 'alerts', 'profile']);

function readRoute() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  const screen = path?.startsWith('/gate/') ? path.slice(6) : null;
  const preview = new URLSearchParams(query).get('preview');
  return { screen: screens.has(screen) ? screen : null, preview: ['design', 'offline', 'synced'].includes(preview) ? preview : null };
}

export function useGateRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

export function navigateGate(screen, preview) {
  window.location.hash = `/gate/${screen}${preview ? `?preview=${preview}` : ''}`;
}
