interface AkshayaLogoIconProps {
  className?: string;
  size?: number;
}

/**
 * Akshaya Kerala Star / Lotus Flower Emblem.
 * Represents the official symbol of the Akshaya Kerala IT Project:
 * an 8-petal blooming lotus / radiating technological star with a central core.
 */
export function AkshayaLogoIcon({ className = 'text-ink-900', size = 24 }: AkshayaLogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Akshaya Kerala Emblem"
      role="img"
    >
      {/* Central Core Disk */}
      <circle cx="12" cy="12" r="2.8" />

      {/* 4 Cardinal Lotus Petals */}
      <path d="M12 1.5C10.6 4.5 10.6 7.5 12 9.2C13.4 7.5 13.4 4.5 12 1.5Z" />
      <path d="M12 22.5C10.6 19.5 10.6 16.5 12 14.8C13.4 16.5 13.4 19.5 12 22.5Z" />
      <path d="M1.5 12C4.5 10.6 7.5 10.6 9.2 12C7.5 13.4 4.5 13.4 1.5 12Z" />
      <path d="M22.5 12C19.5 10.6 16.5 10.6 14.8 12C16.5 13.4 19.5 13.4 22.5 12Z" />

      {/* 4 Diagonal Lotus Petals (Rotated 45 degrees) */}
      <g transform="rotate(45 12 12)">
        <path d="M12 2.5C10.8 5 10.8 7.5 12 9.2C13.2 7.5 13.2 5 12 2.5Z" opacity="0.9" />
        <path d="M12 21.5C10.8 19 10.8 16.5 12 14.8C13.2 16.5 13.2 19 12 21.5Z" opacity="0.9" />
        <path d="M2.5 12C5 10.8 7.5 10.8 9.2 12C7.5 13.2 5 13.2 2.5 12Z" opacity="0.9" />
        <path d="M21.5 12C19 10.8 16.5 10.8 14.8 12C16.5 13.2 19 13.2 21.5 12Z" opacity="0.9" />
      </g>
    </svg>
  );
}
