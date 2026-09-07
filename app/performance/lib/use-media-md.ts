'use client';

import { useEffect, useState } from 'react';

/** True when viewport is at least Tailwind `md` (768px). */
export function useIsMdUp(): boolean {
  const [isMdUp, setIsMdUp] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    function sync() {
      setIsMdUp(media.matches);
    }
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isMdUp;
}
