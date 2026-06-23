import { useState, useEffect, useCallback, useRef } from 'react';
import { validateYoutubeUrl } from '@/utils/validators';

export function useClipboard() {
  const [detectedUrl, setDetectedUrl] = useState('');
  const [showChip, setShowChip] = useState(false);
  const lastCheckedRef = useRef(0);

  const dismissChip = useCallback(() => {
    setShowChip(false);
    setDetectedUrl('');
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const checkClipboard = async () => {
      const now = Date.now();
      if (now - lastCheckedRef.current < 2000) {
        return;
      }
      lastCheckedRef.current = now;

      try {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed && validateYoutubeUrl(trimmed)) {
          if (trimmed !== detectedUrl) {
            setDetectedUrl(trimmed);
            setShowChip(true);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => setShowChip(false), 8000);
          }
        }
      } catch (_) {
        // clipboard API may be restricted
      }
    };

    window.addEventListener('focus', checkClipboard);
    return () => {
      window.removeEventListener('focus', checkClipboard);
      if (timer) clearTimeout(timer);
    };
  }, [detectedUrl]);

  return { detectedUrl, showChip, setShowChip, dismissChip };
}
