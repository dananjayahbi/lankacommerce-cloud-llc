import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LankaCommerce — Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-x-hidden font-sans">
      {/* Left Panel: Modern Branding & Visual Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col justify-between p-16 text-white bg-slate-950">
        {/* Background Image with Aerial Coral Reef View */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/login_bg.png"
            className="absolute inset-0 w-full h-full object-cover select-none brightness-[0.85] contrast-[1.05]"
            alt="LankaCommerce Premium Background"
          />
          {/* Subtle dark gradient overlay to ensure perfect readability */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-950/50 to-transparent" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-lg font-mono">LC</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm font-sans">
            LankaCommerce
          </span>
        </div>

        {/* Value Proposition Hero Text */}
        <div className="relative z-10 my-auto max-w-lg">
          <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] tracking-tight mb-5 text-white drop-shadow-md">
            Unleash the full potential of your retail business
          </h2>
          <p className="text-lg text-slate-200/90 leading-relaxed font-light drop-shadow-sm">
            Modern retail management and cloud ERP platform designed for unmatched speed, control, and commercial growth.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-sm text-slate-400 font-light">
          © {new Date().getFullYear()} LankaCommerce Cloud LLC. All rights reserved.
        </div>

        {/* Decorative elements: Bottom-Left Abstract concentric glass circles */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 border border-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-8 w-64 h-64 border border-white/5 rounded-full pointer-events-none" />

        {/* Masking SVG Wave Divider (Curves dynamically into the left image area) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute top-0 right-0 h-full w-24 text-white fill-current translate-x-[1px] pointer-events-none z-10"
        >
          <path d="M100,0 L100,100 L30,100 C60,90 10,80 20,65 C35,50 80,45 50,30 C30,20 70,10 80,0 Z" />
        </svg>
      </div>

      {/* Right Panel: Content Form Area (Scrollable on Mobile) */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-h-screen bg-white flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24 py-16 relative overflow-x-hidden overflow-y-auto">
        <div className="w-full max-w-md mx-auto relative z-10">
          {children}
        </div>

        {/* Decorative elements: Bottom-Right Abstract Black Circles (Pinterest inspiration) */}
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-black rounded-full pointer-events-none select-none z-0" />
        <div className="absolute -bottom-20 -right-20 w-56 h-56 border border-black/10 rounded-full pointer-events-none select-none z-0" />
        <div className="absolute -bottom-28 -right-28 w-72 h-72 border border-black/5 rounded-full pointer-events-none select-none z-0" />
        <div className="absolute -bottom-36 -right-36 w-88 h-88 border border-black/[0.02] rounded-full pointer-events-none select-none z-0" />
      </div>
    </div>
  );
}
