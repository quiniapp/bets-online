import { ParticleBackground } from "../particle-background"

interface LoaderPageProps {
  /** Optional caption shown under the wordmark. */
  text?: string
}

/**
 * Standard loading screen: an animated particle field plus the ArenaBet
 * wordmark. Purely CSS/canvas based (no external asset), used as the App Router
 * route-level loading UI and as the first-paint splash.
 */
const LoaderPage = ({ text = "Cargando..." }: LoaderPageProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background">
      <ParticleBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        <h1 className="arena-wordmark select-none text-5xl font-black tracking-tight sm:text-7xl">
          ArenaBet
        </h1>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="arena-dot" />
          <span className="arena-dot" style={{ animationDelay: "160ms" }} />
          <span className="arena-dot" style={{ animationDelay: "320ms" }} />
        </div>
        {text && (
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoaderPage
