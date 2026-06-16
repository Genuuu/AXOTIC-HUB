import React from "react";
import { ArrowRight, Lock } from "lucide-react";
import logoUrl from "../../Images/Logo.png";

interface PublicLandingProps {
  onOpenLogin: () => void;
}

export default function PublicLanding({ onOpenLogin }: PublicLandingProps) {
  return (
    <div 
      id="public-landing-container" 
      className="min-h-screen bg-[#fafbfe] text-[#0f2e46] flex flex-col items-center justify-between p-6 sm:p-12 relative overflow-hidden font-sans antialiased"
    >
      {/* Structural background lines and elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-slate-200" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-slate-200" />
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-120 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -z-20" />

      {/* Top Header Row */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <img 
            src={logoUrl} 
            alt="AXOTIC Logo" 
            className="h-7 object-contain" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="font-display font-medium text-xs tracking-[0.2em] text-[#0f2e46]/60 uppercase">
            Team Hub
          </span>
        </div>
        <button
          id="top-nav-portal-btn"
          onClick={onOpenLogin}
          className="text-xs font-semibold tracking-wider text-[#0f2e46]/70 hover:text-[#0f2e46] hover:bg-slate-100/80 px-3.5 py-1.5 rounded-lg border border-slate-200/60 transition-all font-mono cursor-pointer flex items-center gap-1.5"
        >
          <Lock className="size-3" /> SECURE GATEWAY
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl text-center z-10 py-12">
        <div className="w-full max-w-[480px] sm:max-w-[540px] px-4 mb-10">
          <svg 
            viewBox="0 0 610 220" 
            className="w-full h-auto drop-shadow-[0_2px_12px_rgba(15,46,70,0.08)]"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Letter 'A' */}
            <path 
              d="M 25,170 L 65,50 L 105,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              strokeLinejoin="miter" 
              fill="none"
            />
            <path 
              d="M 42,130 L 88,130" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            
            {/* Letter 'X' */}
            <path 
              d="M 125,50 L 205,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            <path 
              d="M 205,50 L 125,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            
            {/* Orbital Ellipses for 'O' (Behind the star and squircle) */}
            <ellipse 
              cx="285" 
              cy="110" 
              rx="85" 
              ry="24" 
              stroke="#0f2e46" 
              strokeWidth="4" 
              fill="none" 
              transform="rotate(-30 285 110)" 
            />
            <ellipse 
              cx="285" 
              cy="110" 
              rx="85" 
              ry="24" 
              stroke="#0f2e46" 
              strokeWidth="4" 
              fill="none" 
              transform="rotate(30 285 110)" 
            />
            
            {/* The 'O' squircle outer outline */}
            <rect 
              x="230" 
              y="55" 
              width="110" 
              height="110" 
              rx="24" 
              ry="24" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              fill="none"
            />

            {/* Compass Star / Needle (layered with mask fills to hide overlap lines of orbits) */}
            {/* Outlined / Masked halves on background */}
            <path d="M 285,25 L 295,110 L 285,110 Z" fill="#fafbfe" stroke="#0f2e46" strokeWidth="2" />
            <path d="M 285,195 L 275,110 L 285,110 Z" fill="#fafbfe" stroke="#0f2e46" strokeWidth="2" />
            <path d="M 370,110 L 285,100 L 285,110 Z" fill="#fafbfe" stroke="#0f2e46" strokeWidth="2" />
            <path d="M 200,110 L 285,120 L 285,110 Z" fill="#fafbfe" stroke="#0f2e46" strokeWidth="2" />

            {/* Solid navy blue filled halves */}
            <path d="M 285,25 L 275,110 L 285,110 Z" fill="#0f2e46" stroke="#0f2e46" strokeWidth="1" />
            <path d="M 285,195 L 295,110 L 285,110 Z" fill="#0f2e46" stroke="#0f2e46" strokeWidth="1" />
            <path d="M 370,110 L 285,120 L 285,110 Z" fill="#0f2e46" stroke="#0f2e46" strokeWidth="1" />
            <path d="M 200,110 L 285,100 L 285,110 Z" fill="#0f2e46" stroke="#0f2e46" strokeWidth="1" />

            {/* Letter 'T' */}
            <path 
              d="M 370,50 L 440,50" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            <path 
              d="M 405,50 L 405,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            
            {/* Letter 'I' */}
            <path 
              d="M 475,50 L 475,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
            
            {/* Letter 'C' */}
            <path 
              d="M 585,50 L 550,50 A 35,60 0 0,0 550,170 L 585,170" 
              stroke="#0f2e46" 
              strokeWidth="16" 
              strokeLinecap="butt" 
              fill="none"
            />
          </svg>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#0f2e46] mb-8 select-none">
          We&apos;re <span className="text-[#0e3047]">AXOTIC.</span>
        </h1>

        <button 
          id="join-hub-primary-btn"
          onClick={onOpenLogin}
          className="px-8 py-3.5 bg-[#0f2e46] hover:bg-[#1e567d] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg shadow-[#0f2e46]/10 hover:shadow-[#0f2e46]/15 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer flex items-center gap-2.5 z-10"
        >
          Secure Portal Entry <ArrowRight className="size-4" />
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#0f2e46]/50 tracking-wider font-mono uppercase gap-4 mt-auto">
        <div>© 2026 AXOTIC ROBOTICS FOUNDATION</div>
        <div className="flex gap-4">
          <a href="#github" className="hover:text-[#0f2e46] transition-colors">Github</a>
          <span>·</span>
          <a href="#lab" className="hover:text-[#0f2e46] transition-colors">Lab Telemetry</a>
        </div>
      </footer>
    </div>
  );
}
