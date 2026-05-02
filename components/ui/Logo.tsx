import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark"; // light = on light bg, dark = on dark bg
  className?: string;
}

const sizes = {
  sm: { icon: 20, fontSize: 14, gap: 6 },
  md: { icon: 26, fontSize: 18, gap: 8 },
  lg: { icon: 34, fontSize: 24, gap: 10 },
};

export default function Logo({ size = "md", variant = "light", className }: LogoProps) {
  const s = sizes[size];
  const textColor = variant === "dark" ? "#f5f0e8" : "#1c1a17";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {/* Icon: two arrows forming a loop — represents lending & returning */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Amber circle background */}
        <rect width="32" height="32" rx="8" fill="#f5a800" />

        {/* Left-to-right arrow (top) */}
        <path
          d="M7 11 L20 11"
          stroke="#1c1a17"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polyline
          points="16,7 21,11 16,15"
          fill="none"
          stroke="#1c1a17"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right-to-left arrow (bottom) */}
        <path
          d="M25 21 L12 21"
          stroke="#1c1a17"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polyline
          points="16,17 11,21 16,25"
          fill="none"
          stroke="#1c1a17"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      <span
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: s.fontSize,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: textColor,
        }}
      >
        lend
        <span style={{ color: "#f5a800" }}>me</span>
      </span>
    </div>
  );
}
