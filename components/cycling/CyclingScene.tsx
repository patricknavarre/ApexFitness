'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  applySceneryPlaybackRate,
  createSceneryPlaybackState,
} from '@/lib/cycling/scenery-playback';

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
    const playbackStateRef = useRef(createSceneryPlaybackState());
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

      // Fresh animation list after mount; pause until the rider moves.
      playbackStateRef.current = createSceneryPlaybackState();
      // Defer so the browser has created CSSAnimation instances.
      const id = window.requestAnimationFrame(() => {
        const root = containerRef.current;
        if (!root) return;
        playbackStateRef.current.animations = root.getAnimations({
          subtree: true,
        });
        applySceneryPlaybackRate(root, 0, playbackStateRef.current);
      });
      return () => window.cancelAnimationFrame(id);
    }, [svg]);

    useImperativeHandle(ref, () => ({
      setPlaybackRate(rate: number) {
        const el = containerRef.current;
        if (!el || !svg) return;

        if (rate <= 0) {
          smoothRef.current = 0;
          applySceneryPlaybackRate(el, 0, playbackStateRef.current);
          return;
        }

        smoothRef.current = smoothRef.current * 0.7 + rate * 0.3;
        applySceneryPlaybackRate(
          el,
          smoothRef.current,
          playbackStateRef.current
        );
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
