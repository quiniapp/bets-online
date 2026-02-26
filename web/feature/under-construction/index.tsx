export default function UnderConstructionPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black"
    >
      {/* Animated radial glow */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.08); }
        }
        .glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="glow-pulse pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, #D4AF37 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-1 rounded-full"
            style={{ background: "#D4AF37" }}
          />
          <h1
            className="text-6xl font-bold tracking-widest text-white sm:text-7xl md:text-8xl"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            ARENABET
          </h1>
        </div>

        {/* Status */}
        <p className="text-xl font-light tracking-[0.3em] text-gray-300 uppercase">
          Sitio en construcción
        </p>

        {/* Decorative line */}
        <div
          className="h-px w-32"
          style={{ background: "#D4AF37" }}
        />

        {/* Secondary message */}
        <p className="max-w-sm text-sm text-gray-500">
          Estamos preparando algo grande. Volvé pronto.
        </p>
      </div>
    </div>
  )
}
