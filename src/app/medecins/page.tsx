import type { Metadata } from "next"
import { cache, Suspense } from "react"
import { MedecinForm } from "@/components/forms/medecin-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { PatientAvatar } from "@/components/patient-avatar"
import { Mono, Pill } from "@/components/pill"
import { QueryPanel, QueryPanelSkeleton } from "@/components/query-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { medecinsAvecUsage } from "@/lib/data"
import { readLastWrite } from "@/lib/last-write"

export const metadata: Metadata = { title: "Médecins" }

const load = cache(() => medecinsAvecUsage())

async function MedecinsQueryPanel() {
  const [{ entry }, lastWrite] = await Promise.all([load(), readLastWrite()])
  return <QueryPanel entries={[entry]} lastWrite={lastWrite} />
}

async function MedecinsContent() {
  const { data: medecins } = await load()
  const specialites = [...new Set(medecins.map((m) => m.specialite))].sort((a, b) => a.localeCompare(b))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="bg-muted/40 [&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Médecin</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead className="pr-4 text-right">Patients suivis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medecins.map((m) => (
              <TableRow key={m.medecinId}>
                <TableCell className="py-2.5 pl-4">
                  <div className="flex items-center gap-3">
                    <PatientAvatar patient={m} size="sm" />
                    <div>
                      <p className="font-medium">
                        Dr {m.prenom} {m.nom}
                      </p>
                      <Mono>{m.medecinId}</Mono>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Pill tone="teal">{m.specialite}</Pill>
                </TableCell>
                <TableCell className="pr-4 text-right font-medium tabular-nums">{m.nbDossiers}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <footer className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {medecins.length} médecin{medecins.length > 1 ? "s" : ""} · chacun est stocké une seule fois et référencé par{" "}
          <Mono>consultations.medecinId</Mono>
        </footer>
      </section>
      <MedecinForm specialites={specialites} />
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export default function MedecinsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: "Medex", href: "/dossiers" }, { label: "Référentiels" }, { label: "Médecins" }]} />}
        title="Médecins"
        description={
          <>
            Collection <Mono className="text-foreground/80">medecins</Mono> : la donnée qui était recopiée dans chaque
            consultation, extraite et référencée par identifiant.
          </>
        }
        actions={
          <Suspense fallback={<QueryPanelSkeleton />}>
            <MedecinsQueryPanel />
          </Suspense>
        }
      />
      <Suspense fallback={<ContentSkeleton />}>
        <MedecinsContent />
      </Suspense>
    </>
  )
}
