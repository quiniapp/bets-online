import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  title: string
  emoji?: string
  onShowAll?: () => void
  className?: string
}

/**
 * Ganamos-style section heading: gradient icon chip, uppercase title, short
 * gold-to-magenta underline and a pill "Mostrar todo" action.
 */
export function SectionHeading({ title, emoji, onShowAll, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-chart-3 text-base shadow-lg shadow-primary/25">
          {emoji ?? "🎰"}
        </span>
        <div className="flex flex-col">
          <span className="text-lg font-black uppercase leading-none tracking-tight text-foreground">{title}</span>
          <span className="mt-1.5 h-[3px] w-12 rounded-full bg-gradient-to-r from-chart-3 to-primary" />
        </div>
      </div>
      {onShowAll && (
        <button
          onClick={onShowAll}
          className="rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          Mostrar todo
        </button>
      )}
    </div>
  )
}

export default SectionHeading
