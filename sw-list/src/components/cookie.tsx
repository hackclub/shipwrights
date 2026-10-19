const STARDANCE = 'https://stardance.hackclub.com/assets/landing/header/stardance-logo-df399a7f.png'
const HC = 'https://assets.hackclub.com/banners/2026.svg'

export function Cookie() {
  return (
    <>
      <style>{`
        @keyframes _cu_up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="_cu"] {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        ._cu_a0 { animation: _cu_up 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        ._cu_a1 { animation: _cu_up 0.65s cubic-bezier(0.16,1,0.3,1) 0.09s both; }
        ._cu_a2 { animation: _cu_up 0.65s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        ._cu_cta_link {
          opacity: 0.8;
          transition: opacity 0.15s ease, transform 0.15s ease;
          display: inline-block;
        }
        ._cu_cta_link:hover {
          opacity: 1;
          transform: translateY(-2px);
        }
        ._cu_link {
          color: #f4f4f5;
          text-decoration: underline;
          text-decoration-color: rgba(103,232,249,0.45);
          text-underline-offset: 4px;
          transition: color 0.15s ease, text-decoration-color 0.15s ease;
        }
        ._cu_link:hover {
          color: #67e8f9;
          text-decoration-color: #67e8f9;
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shipwrights is moving to Stardance"
        className="fixed inset-0 z-[9999] overflow-hidden select-none"
        style={{ background: '#08090c', fontFamily: "'Phantom Sans', system-ui, sans-serif" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-start justify-between">
          <a href="https://hackclub.com/" className="pointer-events-auto" style={{ lineHeight: 0 }}>
            <img src={HC} alt="Hack Club" style={{ width: 210, border: 0 }} />
          </a>
          <div className="p-4">
            <img src="/logo_nobg_dark.png" alt="Shipwrights" style={{ height: 38, width: 'auto', opacity: 0.55 }} />
          </div>
        </div>


        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-6">
          <h1
            className="_cu_a0 font-bold text-white text-balance"
            style={{
              fontSize: 'clamp(3rem, 9vw, 6rem)',
              lineHeight: 0.96,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
            }}
          >
            weighing anchor.
          </h1>

          <p className="_cu_a1" style={{ marginBottom: '2rem', lineHeight: 1.3 }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(0.75rem, 1.6vw, 0.85rem)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#a1a1aa',
              marginBottom: '0.6rem',
            }}>
              Flavortown has wrapped up
            </span>
            <span style={{
              display: 'block',
              fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
              letterSpacing: '-0.01em',
              color: '#f4f4f5',
            }}>
              The crew&apos;s on Stardance now.
            </span>
          </p>

          <p className="_cu_a2" style={{
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            lineHeight: 1.4,
            color: '#a1a1aa',
            marginBottom: '2.75rem',
          }}>
            Queue stats moved to{' '}
            <a href="https://queue.shipwrights.dev/stardance" className="_cu_link">
              queue.shipwrights.dev/stardance
            </a>
          </p>

          <div className="_cu_a2 text-center">
            <a href="https://stardance.hackclub.com/" className="_cu_cta_link">
              <img src={STARDANCE} alt="Stardance" style={{ height: 110, width: 'auto' }} />
            </a>
          </div>
        </div>

      </div>
    </>
  )
}
