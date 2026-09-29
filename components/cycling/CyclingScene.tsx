'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { applySceneryPlaybackRate } from '@/lib/cycling/scenery-playback';

export type CyclingSceneHandle = {
  setPlaybackRate: (rate: number) => void;
};

type Props = {
  onReady?: () => void;
  onError?: () => void;
};

export const CyclingScene = forwardRef<CyclingSceneHandle, Props>(
  function CyclingScene({ onReady, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const smoothRef = useRef(0);
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
      }
      applySceneryPlaybackRate(el, 0);
    }, [svg]);

    useImperativeHandle(ref, () => ({
      setPlaybackRate(rate: number) {
        const el = containerRef.current;
        if (!el || !svg) return;

        smoothRef.current = smoothRef.current * 0.5 + rate * 0.5;
        const r = rate <= 0 ? 0 : smoothRef.current;
        applySceneryPlaybackRate(el, r);
      },
    }));

    if (!svg) return null;

    return (
      <div
        ref={containerRef}
        className="ride-world__scenery"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
);
