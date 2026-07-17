'use client';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// The app ships a generic icon (src/app/icon.svg). Once we know which company the
// signed-in user belongs to, point the tab icon and title at that company instead,
// so each tenant sees their own branding. If the logo can't be loaded we quietly
// keep the default icon rather than showing a broken one.
export default function CompanyFavicon() {
  const { company } = useAuth();
  const logo = company?.logo || null;
  const name = company?.name || null;

  useEffect(() => {
    if (name) document.title = `${name} — HRMS`;
  }, [name]);

  useEffect(() => {
    if (!logo) return undefined;
    let cancelled = false;
    const LINK_ID = 'company-favicon';

    // Only swap the icon once we know the image actually loads.
    const probe = new Image();
    probe.onload = () => {
      if (cancelled) return;
      let link = document.getElementById(LINK_ID);
      if (!link) {
        link = document.createElement('link');
        link.id = LINK_ID;
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logo;
    };
    probe.src = logo;

    return () => {
      cancelled = true;
      probe.onload = null;
      document.getElementById(LINK_ID)?.remove();
    };
  }, [logo]);

  return null;
}
