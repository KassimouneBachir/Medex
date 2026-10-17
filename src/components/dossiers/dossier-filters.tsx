"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Filters } from "@/lib/data"
import { SEXES } from "@/lib/format"
import { cn } from "@/lib/utils"

type Item = { value: string; label: string }

function FilterSelect({
  items,
  value,
  onChange,
  className,
  label,
}: {
  items: Item[]
  value: string
  onChange: (v: string) => void
  className?: string
  label: string
}) {
  return (
    <Select items={items} value={value || "all"} onValueChange={(v) => onChange(v && v !== "all" ? String(v) : "")}>
      <SelectTrigger aria-label={label} className={cn("data-[size=default]:h-9", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function toUrl(f: Filters) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `/dossiers?${qs}` : "/dossiers"
}

export function DossierFilters({
  filters,
  specialites,
  groupes,
}: {
  filters: Filters
  specialites: string[]
  groupes: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(filters.q)

  const navigate = (next: Filters) => startTransition(() => router.replace(toUrl(next), { scroll: false }))
  const set = (patch: Partial<Filters>) => navigate({ ...filters, q, ...patch })

  // Recherche « au fil de la frappe », avec un léger délai pour ne pas spammer MongoDB.
  useEffect(() => {
    if (q === filters.q) return
    const timer = setTimeout(
      () => startTransition(() => router.replace(toUrl({ ...filters, q }), { scroll: false })),
      300,
    )
    return () => clearTimeout(timer)
  }, [q, filters, router])

  const active = Boolean(filters.q || filters.sexe || filters.groupe || filters.specialite || filters.allergies)

  return (
    <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un patient, un n° de dossier…"
          aria-label="Rechercher"
          className="h-9 pl-8"
        />
        {pending && (
          <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <FilterSelect
          label="Sexe"
          className="h-9 w-full sm:w-32"
          value={filters.sexe}
          onChange={(sexe) => set({ sexe })}
          items={[{ value: "all", label: "Tous sexes" }, ...SEXES]}
        />
        <FilterSelect
          label="Groupe sanguin"
          className="h-9 w-full sm:w-36"
          value={filters.groupe}
          onChange={(groupe) => set({ groupe })}
          items={[{ value: "all", label: "Tous groupes" }, ...groupes.map((g) => ({ value: g, label: `Groupe ${g}` }))]}
        />
        <FilterSelect
          label="Spécialité"
          className="h-9 w-full sm:w-44"
          value={filters.specialite}
          onChange={(specialite) => set({ specialite })}
          items={[{ value: "all", label: "Toutes spécialités" }, ...specialites.map((s) => ({ value: s, label: s }))]}
        />
        <FilterSelect
          label="Allergies"
          className="h-9 w-full sm:w-40"
          value={filters.allergies}
          onChange={(v) => set({ allergies: v as Filters["allergies"] })}
          items={[
            { value: "all", label: "Allergies : toutes" },
            { value: "oui", label: "Avec allergies" },
            { value: "non", label: "Sans allergie" },
          ]}
        />
        {active && (
          <Button
            variant="ghost"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setQ("")
              navigate({ q: "", sexe: "", groupe: "", specialite: "", allergies: "" })
            }}
          >
            <XIcon data-icon="inline-start" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  )
}
