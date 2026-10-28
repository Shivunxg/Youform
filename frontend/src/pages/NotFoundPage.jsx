import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

export default function NotFoundPage() {
  return (
    <>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noindex />
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div style={{ fontSize: 80, fontWeight: 900, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1, color: '#111', marginBottom: 8 }}>
            404
          </div>
          <h1 className="text-2xl font-display font-bold text-ink mb-3">
            Page not found
          </h1>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/"
              style={{ background: '#111', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '2px solid #111', boxShadow: '3px 3px 0 #f97316' }}
            >
              Back to homepage
            </a>
            <Link
              to="/templates"
              style={{ background: 'transparent', color: '#111', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}
            >
              Browse templates
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
