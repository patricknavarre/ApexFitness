import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-8">
      <h1 className="font-display text-6xl text-accent mb-4">404</h1>
      <p className="font-sans text-muted mb-6">This page could not be found.</p>
      <Link
        href="/"
        className="bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow transition-shadow"
      >
        Back to home
      </Link>
    </div>
  );
}
