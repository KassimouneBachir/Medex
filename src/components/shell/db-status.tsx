import { DatabaseIcon } from "lucide-react"
import { dbStatus } from "@/lib/data"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground">{value}</dd>
    </div>
  )
}

export async function DbStatus() {
  const s = await dbStatus()
  return (
    <div className="rounded-xl border bg-background/60 p-3 text-xs">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="relative flex size-2">
          {s.ok && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" />}
          <span className={`relative inline-flex size-2 rounded-full ${s.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
        </span>
        <span className="font-medium">{s.ok ? "Connecté" : "Déconnecté"}</span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <DatabaseIcon className="size-3" />
          {s.ok ? `MongoDB ${s.version}` : "MongoDB"}
        </span>
      </div>
      <dl className="space-y-1">
        <Row label="Hôte" value={s.host} />
        <Row label="Base" value={s.db} />
      </dl>
      {s.ok && (
        <dl className="mt-2 space-y-1 border-t pt-2">
          {s.collections.map((c) => (
            <Row key={c.name} label={c.name} value={c.count} />
          ))}
        </dl>
      )}
      {!s.ok && <p className="mt-2 line-clamp-3 text-rose-600 dark:text-rose-300">{s.error}</p>}
    </div>
  )
}

export function DbStatusSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border bg-background/60 p-3">
      <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
    </div>
  )
}
