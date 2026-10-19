import Navbar from './Navbar'

const FONT = "'Barlow Condensed', sans-serif"

export const CONTACT_EMAIL = 'mail@chanelmuir.com'

// Shared shell for the privacy and terms pages: heading, last-updated line and
// readable body copy in SleeveMap's colours.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <style>{`
        .legal {
          max-width: 680px;
          margin: 0 auto;
          padding: 7rem 1.25rem 5rem;
          color: var(--muted);
          font-size: 0.85rem;
          line-height: 1.8;
        }
        .legal h2 {
          font-family: ${FONT};
          font-weight: 600;
          font-size: 1.25rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text);
          margin: 2.5rem 0 0.75rem;
        }
        .legal p, .legal ul { margin-bottom: 1rem; }
        .legal ul { padding-left: 1.25rem; list-style: disc; }
        .legal li { margin-bottom: 0.4rem; }
        .legal strong { color: var(--text); font-weight: 400; }
        .legal a { color: var(--sleeve-gold); }
      `}</style>

      <main className="legal">
        <h1 style={{
          fontFamily: FONT, fontWeight: 700, fontSize: '2.75rem', lineHeight: 1,
          textTransform: 'uppercase', color: 'var(--text)', marginBottom: '0.75rem',
        }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--sleeve-gold)', marginBottom: '2rem' }}>
          Last updated {updated}
        </p>
        {children}
      </main>
    </div>
  )
}
