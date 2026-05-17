import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "icon" | "wordmark" | "full";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, wordmarkH: 22 },
  md: { icon: 36, wordmarkH: 28 },
  lg: { icon: 48, wordmarkH: 38 },
};

/**
 * CampaignWise Logo Component
 * Uses the actual SVG brand assets from /public
 */
export default function Logo({
  variant = "full",
  size = "md",
  href = "/dashboard",
  className = "",
}: LogoProps) {
  const { icon: iconSize, wordmarkH } = sizeMap[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon mark — the heartbeat/chart waveform */}
      {(variant === "icon" || variant === "full") && (
        <span
          className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-[#2563EB]/10"
          style={{ width: iconSize, height: iconSize, padding: 4 }}
        >
          <Image
            src="/logo-icon.svg"
            alt="CampaignWise icon"
            width={iconSize}
            height={iconSize}
            priority
          />
        </span>
      )}

      {/* Wordmark — "Campaign" white + "Wise" blue */}
      {(variant === "wordmark" || variant === "full") && (
        <span className="flex flex-col leading-none">
          <span
            className="font-bold tracking-tight text-[#F0F4FF]"
            style={{ fontSize: wordmarkH * 0.72 }}
          >
            Campaign
            <span className="text-[#2563EB]">Wise</span>
          </span>
          {size !== "sm" && (
            <span
              className="text-[#8896B3] font-medium tracking-widest uppercase mt-0.5"
              style={{ fontSize: wordmarkH * 0.32 }}
            >
              Know Why. Fix Fast.
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Inline SVG icon — for places where Image tag isn't ideal (e.g. sidebar favicon)
 */
export function LogoIconInline({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="240 290 220 180"
      width={size}
      height={size}
      className={className}
      aria-label="CampaignWise"
    >
      <defs>
        <linearGradient id="cwGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* Main waveform + arrow */}
      <path
        d="M 281.31 433.55 C279.65,435.21 278.00,435.45 278.00,434.04 C278.00,433.51 277.09,432.23 275.97,431.19 C274.39,429.71 274.13,428.76 274.82,426.90 C275.30,425.58 282.15,398.62 290.03,367.00 C297.92,335.38 305.03,308.71 305.84,307.75 C307.74,305.49 311.25,305.51 313.31,307.79 C314.20,308.78 315.63,312.71 316.49,316.54 C317.35,320.37 319.38,329.12 321.01,336.00 C322.63,342.88 326.69,360.65 330.03,375.50 C333.37,390.35 336.52,403.51 337.03,404.75 C337.93,406.93 338.40,407.00 351.33,407.00 L 364.70 407.00 L 372.75 397.75 C377.18,392.66 388.25,379.95 397.35,369.51 C411.44,353.34 413.64,350.38 412.20,349.56 C411.26,349.03 406.00,346.94 400.50,344.92 C394.49,342.71 390.50,340.69 390.50,339.87 C390.50,339.07 392.45,338.02 395.18,337.34 C404.61,335.02 438.77,329.70 440.36,330.31 C441.59,330.78 442.00,332.23 442.00,336.07 C442.00,340.78 436.38,376.95 435.51,377.82 C434.69,378.64 433.08,376.80 431.08,372.74 C429.93,370.41 427.52,366.21 425.74,363.41 L 422.50 358.31 L 398.20 385.66 C384.84,400.71 372.71,413.80 371.25,414.76 C367.34,417.33 338.59,417.88 332.38,415.51 C327.53,413.65 327.69,414.00 324.51,398.71 C319.30,373.69 310.95,335.41 310.39,334.00 C309.47,331.68 308.97,333.42 297.46,379.21 C285.11,428.37 283.83,433.16 283.22,432.55 C282.97,432.30 282.11,432.75 281.31,433.55 Z"
        fill="url(#cwGrad)"
      />
      {/* Left baseline segment */}
      <path
        d="M 269.03 426.47 C267.39,428.44 266.21,428.30 262.35,425.66 C259.85,423.95 258.84,422.16 257.46,417.00 C256.51,413.42 254.61,406.90 253.24,402.51 L 250.76 394.52 L 245.99 404.01 C243.14,409.69 241.81,412.98 239.40,414.90 C236.06,417.56 230.65,417.61 216.26,417.74 C184.88,418.09 184.47,418.07 182.75,415.94 C180.52,413.19 180.55,412.45 183.00,410.00 C184.89,408.11 186.33,408.00 209.03,408.00 L 233.07 408.00 L 238.87 395.75 C242.07,389.01 245.48,381.81 246.46,379.74 C248.59,375.24 252.13,373.90 255.00,376.50 C257.15,378.45 258.69,383.02 265.53,407.72 C269.47,421.93 270.08,425.20 269.03,426.47 Z"
        fill="url(#cwGrad)"
      />
    </svg>
  );
}
