import type { Metadata } from "next"
import { cache, Suspense } from "react"
import { DomaineIcon } from "@/components/dossiers/examen-view"
import { TypeExamenForm } from "@/components/forms/type-examen-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { Mono, Pill } from "@/components/pill"
import { QueryPanel, QueryPanelSkeleton } from "@/components/query-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { typesAvecUsage } from "@/lib/data"
import { formatExamen, humanizeKey } from "@/lib/format"
import { readLastWrite } from "@/lib/last-write"
import type { TypeExamen } from "@/lib/types"

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

async function TypesQueryPanel() {
  const [{ entry }, lastWrite] = await Promise.all([load(), readLastWrite()])
  return <QueryPanel entries={[entry]} lastWrite={lastWrite} />
}

async function TypesContent() {
  const { data: types } = await load()
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
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
          {types.length} type{types.length > 1 ? "s" : ""} · le format fixe la forme des résultats, référencés par{" "}
          <Mono>consultations.examens.typeExamenId</Mono>
        </footer>
      </section>
      <TypeExamenForm />
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export default function TypesExamensPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Medex", href: "/dossiers" }, { label: "Référentiels" }, { label: "Types d'examen" }]} />
        }
        title="Types d'examen"
        description={
          <>
            Collection <Mono className="text-foreground/80">typesExamens</Mono> : le catalogue des examens. Le format
            de chaque type décide du formulaire de saisie du résultat.
          </>
        }
        actions={
          <Suspense fallback={<QueryPanelSkeleton />}>
            <TypesQueryPanel />
          </Suspense>
        }
      />
      <Suspense fallback={<ContentSkeleton />}>
        <TypesContent />
      </Suspense>
    </>
  )
}
