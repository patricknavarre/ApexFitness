'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { ScrollCraftRoot } from '@/components/marketing/ScrollCraftRoot';
import '@/app/landing.css';

export function ApexLanding() {
  useEffect(() => {
    let cancelled = false;
    void getSession().then((session) => {
      if (!cancelled && session?.user) {
        window.location.replace('/dashboard');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollCraftRoot className="apex-landing">
      <div data-sc-progress aria-hidden />

      <header className="apex-landing__nav">
        <Link href="/" className="apex-landing__nav-mark">
          APEX
        </Link>
        <Link href="/auth/login" className="apex-landing__nav-link">
          Log in
        </Link>
      </header>

      {/* Act 1 — Arrival */}
      <section
        data-sc-act="flow"
        data-sc-drift="#12140f"
        className="apex-hero"
        aria-label="Hero"
      >
        <div className="sc-stage">
          <div className="apex-hero__atmosphere" data-sc-parallax="-0.12" />
          <div className="apex-hero__grain" aria-hidden />
          <div className="apex-hero__copy" data-sc-cue="0.02 0.95" data-sc-rise="18">
            <h1 className="apex-hero__brand">APEX</h1>
            <p className="apex-hero__line">
              Your body. Your data. Your potential.
            </p>
            <div className="apex-hero__ctas">
              <Link href="/auth/signup" className="apex-btn apex-btn--primary">
                Start for Free
              </Link>
              <Link href="/auth/login" className="apex-btn apex-btn--ghost">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Act 2 — Proof (asymmetric, not equal cards) */}
      <section
        data-sc-act="pin"
        data-sc-span="2.1"
        data-sc-dwell="0.25"
        data-sc-drift="#0e100c"
        className="apex-proof"
        aria-label="What you get"
      >
        <div className="sc-stage">
          <div className="apex-proof__rail">
            <div
              className="apex-proof__row"
              data-sc-cue="0.08 0.42"
              data-sc-rise="22"
            >
              <div className="apex-proof__body">
                <p className="apex-proof__kicker">See clearly</p>
                <h2 className="apex-proof__title">AI body analysis</h2>
                <p className="apex-proof__text">
                  Upload a photo and get structured feedback you can act on,
                  not a wall of guesswork.
                </p>
              </div>
            </div>

            <hr className="apex-proof__rule" data-sc-cue="0.28 0.55" />

            <div
              className="apex-proof__row apex-proof__row--flip"
              data-sc-cue="0.32 0.68"
              data-sc-rise="22"
            >
              <div className="apex-proof__body">
                <p className="apex-proof__kicker">Train with intent</p>
                <h2 className="apex-proof__title">Plans that fit your week</h2>
                <p className="apex-proof__text">
                  Workouts and nutrition shaped around your goals, schedule,
                  and progress, so every session earns its place.
                </p>
              </div>
            </div>

            <hr className="apex-proof__rule" data-sc-cue="0.55 0.78" />

            <div
              className="apex-proof__row"
              data-sc-cue="0.58 0.92"
              data-sc-rise="22"
            >
              <div className="apex-proof__body">
                <p className="apex-proof__kicker">Stay honest</p>
                <h2 className="apex-proof__title">Ride, move, and measure</h2>
                <p className="apex-proof__text">
                  Virtual rides, walks, and logged sessions keep the feedback
                  loop tight between effort and results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Act 3 — Peak: product surface rises */}
      <section
        data-sc-act="pin"
        data-sc-span="2.2"
        data-sc-dwell="0.3"
        data-sc-drift="#0a0c08"
        className="apex-peak"
        aria-label="Inside the app"
      >
        <div className="sc-stage">
          <div className="apex-peak__layout">
            <div
              className="apex-peak__copy"
              data-sc-cue="0.08 0.55"
              data-sc-rise="16"
            >
              <h2 className="apex-peak__title">Training, in one frame</h2>
              <p className="apex-peak__text">
                Power, heart rate, and the road ahead, held in the same cockpit
                you will open every day.
              </p>
            </div>

            <div className="apex-cockpit" data-sc-tilt="5" aria-hidden>
              <div className="apex-cockpit__chrome">
                <span className="apex-cockpit__mark">APEX</span>
                <span className="apex-cockpit__meta">Virtual Ride</span>
              </div>
              <div className="apex-cockpit__grid">
                <div className="apex-cockpit__cell">
                  <span className="apex-cockpit__label">Power</span>
                  <span className="apex-cockpit__value">212 W</span>
                </div>
                <div className="apex-cockpit__cell">
                  <span className="apex-cockpit__label">HR</span>
                  <span className="apex-cockpit__value">148</span>
                </div>
                <div className="apex-cockpit__cell">
                  <span className="apex-cockpit__label">Cadence</span>
                  <span className="apex-cockpit__value">86</span>
                </div>
              </div>
              <div className="apex-cockpit__road" />
            </div>
          </div>
        </div>
      </section>

      {/* Act 4 — Close */}
      <section
        data-sc-act="flow"
        data-sc-drift="#12140f"
        className="apex-close"
        aria-label="Get started"
      >
        <div className="sc-stage">
          <div data-sc-cue="0.15 0.95" data-sc-rise="0" data-sc-magnet="0.2">
            <h2 className="apex-close__title">Show up. Get sharper.</h2>
            <p className="apex-close__text">
              Start free, connect your trainer when you are ready, and keep
              every session in one place.
            </p>
            <div className="apex-close__ctas">
              <Link href="/auth/signup" className="apex-btn apex-btn--primary">
                Start for Free
              </Link>
              <Link href="/auth/login" className="apex-btn apex-btn--ghost">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ScrollCraftRoot>
  );
}
