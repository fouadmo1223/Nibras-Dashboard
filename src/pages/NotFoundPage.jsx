import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-foreground-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Page not found</h1>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Back to overview
        </Link>
      </div>
    </main>
  );
}
