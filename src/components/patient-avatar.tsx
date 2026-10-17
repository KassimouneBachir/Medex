import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

// Couleur stable dérivée du nom : un même patient garde toujours la même teinte.
const HUES = [
  "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200",
]

function hueFor(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]
}

export function PatientAvatar({
  patient,
  size = "md",
  className,
}: {
  patient: { nom: string; prenom: string }
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight select-none",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg",
        hueFor(patient.nom + patient.prenom),
        className,
      )}
    >
      {initials(patient)}
    </span>
  )
}
