'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#f0f0f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <h2 style={{ color: '#ff4757', marginBottom: '1rem', fontSize: '1.5rem' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#6b6b7a', marginBottom: '1.5rem', textAlign: 'center' }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{
          background: '#e8ff47',
          color: '#000',
          fontWeight: 'bold',
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
