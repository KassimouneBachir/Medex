import Link from "next/link"

export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[60%]" aria-hidden>
        <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
      </svg>
    </span>
  )
}

export function Brand() {
  return (
    <Link href="/dossiers" className="flex items-center gap-2.5">
      <Logo />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Medex</span>
        <span className="block text-xs text-muted-foreground">Dossiers médicaux</span>
      </span>
    </Link>
  )
}
