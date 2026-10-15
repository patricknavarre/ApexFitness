'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type ScrollCraftApi = {
  destroy: () => void;
};

type ScrollCraftGlobal = {
  mount: (root: HTMLElement) => ScrollCraftApi;
  instances: ScrollCraftApi[];
};

declare global {
  interface Window {
    ScrollCraft?: ScrollCraftGlobal;
  }
}

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Loads the vendored scroll-craft engine for the marketing landing only.
 * Engine files in public/scrollcraft are never edited per project.
 */
export function ScrollCraftRoot({ children, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let api: ScrollCraftApi | null = null;
    let linkEl: HTMLLinkElement | null = null;
    let scriptEl: HTMLScriptElement | null = null;

    async function boot() {
      if (!document.querySelector('link[data-scrollcraft]')) {
        linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = '/scrollcraft/scrollcraft.css';
        linkEl.setAttribute('data-scrollcraft', '1');
        document.head.appendChild(linkEl);
      }

      const ensureScript = () =>
        new Promise<void>((resolve, reject) => {
          if (window.ScrollCraft?.mount) {
            resolve();
            return;
          }
          const existing = document.querySelector(
            'script[data-scrollcraft]'
          ) as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener(
              'error',
              () => reject(new Error('scrollcraft.js failed')),
              { once: true }
            );
            return;
          }
          scriptEl = document.createElement('script');
          scriptEl.src = '/scrollcraft/scrollcraft.js';
          scriptEl.async = true;
          scriptEl.setAttribute('data-scrollcraft', '1');
          scriptEl.onload = () => resolve();
          scriptEl.onerror = () => reject(new Error('scrollcraft.js failed'));
          document.body.appendChild(scriptEl);
        });

      try {
        await ensureScript();
        if (cancelled || !rootRef.current || !window.ScrollCraft) return;
        api = window.ScrollCraft.mount(rootRef.current);
      } catch {
        /* engine optional — page still readable without it */
      }
    }

    void boot();

    return () => {
      cancelled = true;
      try {
        api?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
