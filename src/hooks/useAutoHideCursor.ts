import { useEffect } from 'react';

export function useAutoHideCursor(active: boolean, hideDelay = 2000) {
  useEffect(() => {
    if (!active) {
      document.body.style.cursor = '';
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const hide = () => { document.body.style.cursor = 'none'; };
    const show = () => {
      document.body.style.cursor = '';
      clearTimeout(timer);
      timer = setTimeout(hide, hideDelay);
    };

    hide();

    window.addEventListener('mousemove', show);

    return () => {
      window.removeEventListener('mousemove', show);
      clearTimeout(timer);
      document.body.style.cursor = '';
    };
  }, [active, hideDelay]);
}
