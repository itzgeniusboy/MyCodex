import React from "react";

interface PocketCodexLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  variant?: "horizontal" | "vertical" | "icon-only";
}

export default function PocketCodexLogo({
  size = "md",
  showText = true,
  className = "",
  variant = "horizontal",
}: PocketCodexLogoProps) {
  // Determine SVG Dimensions
  const dimensions = {
    sm: { box: "h-7 w-7", iconSize: "h-5 w-5", textClass: "text-sm", subClass: "text-[8px]" },
    md: { box: "h-10 w-10", iconSize: "h-7 w-7", textClass: "text-base", subClass: "text-[9px]" },
    lg: { box: "h-12 w-12", iconSize: "h-9 w-9", textClass: "text-lg", subClass: "text-[10px]" },
    xl: { box: "h-16 w-16", iconSize: "h-12 w-12", textClass: "text-2xl", subClass: "text-[11px]" },
  }[size];

  const logoIcon = (
    <div className={`relative flex items-center justify-center ${dimensions.box} rounded-xl bg-[#09090b] border border-[#ff5500]/30 shadow-[0_0_15px_rgba(255,85,0,0.1)] overflow-visible group shrink-0`}>
      {/* Interactive hover glowing network pulse background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#ff3c00]/5 via-amber-500/0 to-transparent rounded-xl pointer-events-none group-hover:from-[#ff3c00]/15 transition-all duration-300" />
      
      {/* Outer ambient hexagon shadow rings */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500 to-[#ff3c00] opacity-80" />

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dimensions.iconSize} transition-transform duration-500 group-hover:scale-105`}
      >
        <defs>
          <linearGradient id="cyberHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9f00" />
            <stop offset="50%" stopColor="#ff5500" />
            <stop offset="100%" stopColor="#ff2200" />
          </linearGradient>
          <linearGradient id="neuralPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9f00" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff2200" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff5500" stopOpacity="1" />
            <stop offset="40%" stopColor="#ff5500" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff2200" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient background portal glow */}
        <circle cx="50" cy="50" r="32" fill="url(#nodeGlow)" opacity="0.3" className="animate-pulse" />

        {/* sleeks geometric Outer Hexagon Frame (Digital Codex Cover) */}
        <polygon
          points="50,5 91,24.5 91,75.5 50,95 9,75.5 9,24.5"
          stroke="url(#cyberHexGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_4px_rgba(255,85,0,0.5)]"
        />

        {/* Inner geometric accent - Book spine representing neural routing line */}
        <g stroke="url(#neuralPathGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Vertical central book spine */}
          <line x1="50" y1="5" x2="50" y2="35" />
          <line x1="50" y1="65" x2="50" y2="95" />

          {/* Left open page & neural link paths */}
          <path d="M 9,24.5 L 50,35" />
          <path d="M 9,75.5 L 50,65" />
          <path d="M 9,50 L 50,50" opacity="0.4" />
          <path d="M 29.5,14.75 L 50,35" strokeDasharray="3,3" />
          <path d="M 29.5,85.25 L 50,65" strokeDasharray="3,3" />

          {/* Right open page & neural link paths */}
          <path d="M 91,24.5 L 50,35" />
          <path d="M 91,75.5 L 50,65" />
          <path d="M 91,50 L 50,50" opacity="0.4" />
          <path d="M 70.5,14.75 L 50,35" strokeDasharray="3,3" />
          <path d="M 70.5,85.25 L 50,65" strokeDasharray="3,3" />
        </g>

        {/* Neural nodes / link junction vertices */}
        <g fill="#ff5500" opacity="0.9">
          <circle cx="29.5" cy="14.75" r="2.5" />
          <circle cx="29.5" cy="85.25" r="2.5" />
          <circle cx="70.5" cy="14.75" r="2.5" />
          <circle cx="70.5" cy="85.25" r="2.5" />
          <circle cx="9" cy="50" r="2.5" />
          <circle cx="91" cy="50" r="2.5" />
        </g>

        {/* Central intelligence node pulsing & ping animations */}
        <circle
          cx="50"
          cy="50"
          r="11"
          fill="none"
          stroke="#ff5500"
          strokeWidth="1"
          className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"
          opacity="0.65"
        />
        <circle
          cx="50"
          cy="50"
          r="8"
          fill="#141416"
          stroke="url(#cyberHexGrad)"
          strokeWidth="1.5"
        />
        {/* Core hot glowing center */}
        <circle
          cx="50"
          cy="50"
          r="4.5"
          fill="#ff9f00"
          className="animate-pulse"
        />
      </svg>
    </div>
  );

  if (variant === "icon-only" || !showText) {
    return <div className={`inline-flex ${className}`}>{logoIcon}</div>;
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {logoIcon}
        <div className="mt-3">
          <h1 className={`font-mono font-black uppercase tracking-[0.25em] text-white ${dimensions.textClass}`}>
            POCKET<span className="text-[#ff5500] bg-gradient-to-r from-amber-400 to-[#ff3c00] bg-clip-text text-transparent">CODEX</span>
          </h1>
          <p className={`font-mono font-bold uppercase tracking-[0.3em] text-[#ff5500]/70 mt-1 ${dimensions.subClass}`}>
            CORE AI WORKSPACE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoIcon}
      <div className="flex flex-col select-none">
        <h1 className={`font-mono font-black uppercase tracking-[0.18em] text-white ${dimensions.textClass} leading-none`}>
          POCKET<span className="text-[#ff5500] bg-gradient-to-r from-amber-400 to-[#ff3c00] bg-clip-text text-transparent">CODEX</span>
        </h1>
        <p className={`font-mono font-bold uppercase tracking-[0.22em] text-[#ff5500]/70 mt-1 pointer-events-none ${dimensions.subClass} leading-none`}>
          CORE AI WORKSPACE
        </p>
      </div>
    </div>
  );
}
