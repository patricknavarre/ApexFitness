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

      // Freeze immediately via CSS class; then pause WAAPI once animations exist.
      playbackStateRef.current = createSceneryPlaybackState();
      el.classList.add('ride-world__scenery--frozen');

      let frames = 0;
      let raf = 0;
      const tryPause = () => {
        const root = containerRef.current;
        if (!root) return;
        const list = root.getAnimations({ subtree: true });
        playbackStateRef.current.animations = list;
        if (list.length > 0) {
          applySceneryPlaybackRate(root, 0, playbackStateRef.current);
          return;
        }
        // Animations may not exist on the first frame after innerHTML inject.
        frames += 1;
        if (frames < 10) raf = window.requestAnimationFrame(tryPause);
      };
      raf = window.requestAnimationFrame(tryPause);
      return () => window.cancelAnimationFrame(raf);
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
        className="ride-world__scenery ride-world__scenery--frozen"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
);
