const codyzaUrl = "https://www.codyza.com";

function CodyzaLogo() {
  return (
    <svg
      className="brand-logo"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Codyza logo"
    >
      <defs>
        <linearGradient id="admin-brand-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#admin-brand-gradient)" />
      <path
        d="M20 25.5C20 18.6 25.6 13 32.5 13c4.1 0 7.9 2 10.2 5.3l-4.2 2.8c-1.4-2-3.6-3.2-6-3.2-4.2 0-7.6 3.4-7.6 7.6s3.4 7.6 7.6 7.6c2.4 0 4.7-1.1 6.1-3.1l4.1 2.8c-2.3 3.3-6 5.2-10.2 5.2-6.9 0-12.5-5.6-12.5-12.5Z"
        fill="#f8fafc"
      />
      <path
        d="M18 44.5h28.7c2.9 0 5.3-2.3 5.3-5.1 0-2.6-2-4.7-4.6-5.1-.8-4.8-5-8.3-9.9-8.3-3.1 0-6 1.4-7.8 3.8a8 8 0 0 0-2-.3c-4.3 0-7.7 3.3-7.7 7.5 0 .9.2 1.7.4 2.5-.8.9-1.3 2.1-1.3 3.4 0 2.7 2.2 4.9 4.9 4.9Z"
        fill="rgba(248,250,252,0.28)"
      />
    </svg>
  );
}

export function CodyzaBranding({
  compact = false,
  showPoweredBy = true,
}: {
  compact?: boolean;
  showPoweredBy?: boolean;
}) {
  return (
    <section className={`brand-card ${compact ? "brand-card--compact" : ""}`}>
      <div className="brand-header">
        <CodyzaLogo />
        <div>
          <p className="admin-eyebrow">Powered by Codyza</p>
          <h2 className="brand-title">Codyza Weather</h2>
        </div>
      </div>
      <p className="brand-copy">
        Codyza builds polished digital experiences backed by reliable application services, live data,
        and operational visibility for teams that need production-ready software.
      </p>
      <div className="brand-actions">
        <a className="admin-button admin-button--secondary" href={codyzaUrl} target="_blank" rel="noreferrer">
          Visit Codyza
        </a>
      </div>
      {showPoweredBy ? <p className="brand-powered">Powered by Codyza</p> : null}
    </section>
  );
}

export function CodyzaFooter() {
  return (
    <footer className="site-footer">
      <span>Powered by Codyza</span>
      <a href={codyzaUrl} target="_blank" rel="noreferrer">
        Visit Codyza
      </a>
    </footer>
  );
}
