import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '6rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '6rem', fontWeight: 900, color: 'var(--color-text-muted)', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '360px' }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" style={{ padding: '0.75rem 2rem', background: 'var(--color-brand-primary)', color: '#fff', borderRadius: '10px', fontWeight: 600 }}>Go Home</Link>
    </div>
  );
}
