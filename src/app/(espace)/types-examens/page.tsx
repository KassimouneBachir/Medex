import { DomaineIcon } from "@/components/dossiers/examen-view"
import { CreateTypeExamenButton } from "@/components/forms/create-dialog"
import { requireRole } from "@/lib/auth"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { Mono, Pill } from "@/components/pill"
import type { Metadata } from "next"
import { cache, Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { typesAvecUsage } from "@/lib/data"
import { formatExamen, humanizeKey } from "@/lib/format"

import type { TypeExamen } from "@/lib/types"

export const instant = false

export const metadata: Metadata = { title: "Types d'examen" }

const load = cache(() => typesAvecUsage())

function Modele({ type }: { type: TypeExamen }) {
  if (type.format === "mesures" && type.parametres?.length)
    return (
      <span className="text-xs text-muted-foreground">
        {type.parametres.map((p) => `${p.parametre} (${p.unite || "—"})`).join(", ")}
      </span>
    )
  if (type.format === "cles" && type.champs?.length)
    return <span className="text-xs text-muted-foreground">{type.champs.map(humanizeKey).join(", ")}</span>
  if (type.format === "imagerie") return <span className="text-xs text-muted-foreground">Zone, images, rapport</span>
  return <span className="text-xs text-muted-foreground">—</span>
}

async function TypesContent() {
  const { data: types } = await load()
  return (
    <>
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="bg-muted/40 [&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Examen</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="hidden xl:table-cell">Modèle de saisie</TableHead>
              <TableHead className="pr-4 text-right">Dossiers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((t) => {
              const format = formatExamen(t.format)
              return (
                <TableRow key={t.typeExamenId}>
                  <TableCell className="py-2.5 pl-4">
                    <div className="flex items-center gap-3">
                      <DomaineIcon domaine={t.domaine} />
                      <div>
                        <p className="font-medium">{t.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          <Mono>{t.typeExamenId}</Mono> · {[t.domaine, t.categorie].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Pill tone={format.tone}>{format.label}</Pill>
                  </TableCell>
                  <TableCell className="hidden max-w-72 truncate whitespace-normal xl:table-cell">
                    <Modele type={t} />
                  </TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular-nums">{t.nbDossiers}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <footer className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {types.length} examen{types.length > 1 ? "s" : ""} disponible{types.length > 1 ? "s" : ""} au catalogue
        </footer>
      </section>
    </>
  )
}

async function CreateTypeExamenAction() {
  await requireRole("admin")
  return <CreateTypeExamenButton />
}

function ContentSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />
}

export default function TypesExamensPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Medex", href: "/dossiers" }, { label: "Administration" }, { label: "Types d'examen" }]} />
        }
        title="Types d'examen"
        description="Définissez les examens disponibles et les informations attendues dans leurs résultats."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-52 rounded-lg" />}>
            <CreateTypeExamenAction />
          </Suspense>
        }

      />
      <Suspense fallback={<ContentSkeleton />}>
        <TypesContent />
      </Suspense>
    </>
  )
}
