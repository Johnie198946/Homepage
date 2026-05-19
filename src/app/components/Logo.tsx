interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export function Logo({ variant = "light", size = "md" }: LogoProps) {
  const isDark = variant === "dark";
  const color = isDark ? "#ffffff" : "#1a1a1a";

  const sizeMap = {
    sm: { scale: 0.7 },
    md: { scale: 1 },
    lg: { scale: 1.3 },
  };

  const scale = sizeMap[size].scale;

  return (
    <svg
      width={150 * scale}
      height={44 * scale}
      viewBox="0 0 150 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Abstract lens - depth of field concept with Japanese aesthetic */}
      <g opacity="0.92">
        {/* Outer circle - soft focus */}
        <circle cx="18" cy="18" r="16" stroke={color} strokeWidth="0.3" fill="none" opacity="0.25" />

        {/* Middle circle - transition zone */}
        <circle cx="18" cy="18" r="11" stroke={color} strokeWidth="0.4" fill="none" opacity="0.4" />

        {/* Inner circle - sharp focus */}
        <circle cx="18" cy="18" r="6.5" stroke={color} strokeWidth="0.6" fill="none" opacity="0.7" />

        {/* Center dot - focal point */}
        <circle cx="18" cy="18" r="1.2" fill={color} opacity="0.8" />

        {/* Minimal aperture indicators - horizontal */}
        <line x1="2" y1="18" x2="5" y2="18" stroke={color} strokeWidth="0.3" opacity="0.3" />
        <line x1="31" y1="18" x2="34" y2="18" stroke={color} strokeWidth="0.3" opacity="0.3" />

        {/* Vertical */}
        <line x1="18" y1="2" x2="18" y2="5" stroke={color} strokeWidth="0.3" opacity="0.3" />
        <line x1="18" y1="31" x2="18" y2="34" stroke={color} strokeWidth="0.3" opacity="0.3" />
      </g>

      {/* Main text - JOHNIE */}
      <text
        x="42"
        y="22"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="17"
        fontWeight="300"
        letterSpacing="5.5"
        fill={color}
      >
        JOHNIE
      </text>

      {/* Minimal divider */}
      <line
        x1="42"
        y1="28"
        x2="138"
        y2="28"
        stroke={color}
        strokeWidth="0.25"
        opacity="0.35"
      />

      {/* Subtitle - PHOTOGRAPHY */}
      <text
        x="42"
        y="36"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="6.5"
        fontWeight="300"
        letterSpacing="3.8"
        fill={color}
        opacity="0.55"
      >
        PHOTOGRAPHY
      </text>
    </svg>
  );
}
