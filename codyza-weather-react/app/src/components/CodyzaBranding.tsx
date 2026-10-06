import "./CodyzaBranding.css";

const codyzaUrl = "https://www.codyza.com";

type CodyzaBrandingProps = {
  compact?: boolean;
  showAbout?: boolean;
  showVisitButton?: boolean;
  showPoweredBy?: boolean;
  className?: string;
};

function CodyzaLogo() {
  return (
    <svg
      className="codyza-brand__logo"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Codyza logo"
    >
      <defs>
        <linearGradient id="codyza-brand-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#codyza-brand-gradient)" />
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
  showAbout = true,
  showVisitButton = true,
  showPoweredBy = true,
  className = "",
}: CodyzaBrandingProps) {
  const classes = ["codyza-brand", compact ? "codyza-brand--compact" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className="codyza-brand__mark">
        <CodyzaLogo />
        <div className="codyza-brand__wordmark">
          <p className="codyza-brand__eyebrow">Powered by Codyza</p>
          <p className="codyza-brand__title">Codyza Weather</p>
        </div>
      </div>

      {showAbout ? (
        <p className="codyza-brand__about">
          Codyza builds polished digital products that blend live data, dependable backend services,
          and thoughtful user experience design for real-world teams.
        </p>
      ) : null}

      {showVisitButton ? (
        <div className="codyza-brand__actions">
          <a
            className="codyza-brand__button"
            href={codyzaUrl}
            target="_blank"
            rel="noreferrer"
          >
            Visit Codyza
          </a>
        </div>
      ) : null}

      {showPoweredBy ? (
        <p className="codyza-brand__powered">
          Powered by <strong>Codyza</strong>
        </p>
      ) : null}
    </section>
  );
}
