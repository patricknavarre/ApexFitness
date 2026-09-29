'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  createSceneryPlaybackState,
  SCENERY_CRUISE_SPEED_VAR,
  setSceneryFrozen,
  setSceneryRate,
} from '@/lib/cycling/scenery-playback';

export type CyclingSceneHandle = {
  setMoving: (moving: boolean) => void;
  setPlaybackRate: (rate: number) => void;
};

type Props = {
  onReady?: () => void;
  onError?: () => void;
};

export const CyclingScene = forwardRef<CyclingSceneHandle, Props>(
  function CyclingScene({ onReady, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef(createSceneryPlaybackState());
    const onReadyRef = useRef(onReady);
    const onErrorRef = useRef(onError);
    const [svg, setSvg] = useState('');

    onReadyRef.current = onReady;
    onErrorRef.current = onError;

    useEffect(() => {
      let cancelled = false;
      fetch('/cycling-bg-ground.svg')
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        })
        .then((text) => {
          if (cancelled) return;
          setSvg(text);
          onReadyRef.current?.();
        })
        .catch(() => {
          if (!cancelled) onErrorRef.current?.();
        });
      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || !svg) return;
      const svgEl = el.querySelector('svg');
      if (svgEl) {
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.display = 'block';
        // Prep cruise speed so the first unfreeze does not rewrite duration mid-play.
        svgEl.style.setProperty('--speed', String(SCENERY_CRUISE_SPEED_VAR));
      }

      stateRef.current = createSceneryPlaybackState();
      el.classList.add('ride-world__scenery--frozen');
    }, [svg]);

    useImperativeHandle(ref, () => ({
      setMoving(moving: boolean) {
        const el = containerRef.current;
        if (!el || !svg) return;
        setSceneryFrozen(el, !moving, stateRef.current);
      },
      setPlaybackRate(rate: number) {
        const el = containerRef.current;
        if (!el || !svg) return;
        setSceneryRate(el, rate, stateRef.current);
      },
    }));

    if (!svg) return null;

    return (
      <div
        ref={containerRef}
        className="ride-world__scenery ride-world__scenery--frozen"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
);
