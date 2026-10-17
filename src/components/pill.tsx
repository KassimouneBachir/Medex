import { cn } from "@/lib/utils"
import type { Tone } from "@/lib/format"

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  teal: "bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-200 dark:ring-teal-400/25",
  sky: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
  rose: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/25",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/25",
  emerald:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25",
}

export function Pill({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&>svg]:size-3",
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

/** Groupe sanguin : pastille rouge discrète, chiffres tabulaires. */
export function BloodType({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-9 items-center justify-center gap-1 rounded-md bg-rose-50 px-1.5 font-mono text-xs font-semibold text-rose-700 tabular-nums ring-1 ring-rose-600/15 ring-inset dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" aria-hidden className="size-2.5 fill-current opacity-80">
        <path d="M6 .8C6 .8 2 5.2 2 7.8a4 4 0 0 0 8 0C10 5.2 6 .8 6 .8Z" />
      </svg>
      {value}
    </span>
  )
}

/** Identifiant technique (dossierId, consultationId…) en police mono. */
export function Mono({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-mono text-[0.8em] text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}
