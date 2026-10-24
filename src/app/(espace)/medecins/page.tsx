import { DoctorAccessForm } from "@/components/auth/doctor-access-form"
import { CreateMedecinButton } from "@/components/forms/create-dialog"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { PatientAvatar } from "@/components/patient-avatar"
import { Pill } from "@/components/pill"
import { requireRole } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import type { Metadata } from "next"
import { cache, Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { medecinsAvecUsage } from "@/lib/data"

export const instant = false

export const metadata: Metadata = { title: "Médecins" }

const load = cache(() => medecinsAvecUsage())

async function MedecinsContent() {
  await requireRole("admin")
  const { data: medecins } = await load()
  const accounts = await (await getDb()).collection("utilisateurs").find({ role: "medecin" }, { projection: { medecinId: 1, email: 1, active: 1 } }).toArray()

  return (
    <>
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
                      <DoctorAccessForm medecinId={m.medecinId} account={(() => { const account = accounts.find((u) => u.medecinId === m.medecinId); return account ? { id: account._id.toHexString(), email: account.email, active: account.active } : undefined })()} />
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
          {medecins.length} médecin{medecins.length > 1 ? "s" : ""} dans votre équipe
        </footer>
      </section>
    </>
  )
}

async function CreateMedecinAction() {
  const { data: medecins } = await load()
  const specialites = [...new Set(medecins.map((m) => m.specialite))].sort((a, b) => a.localeCompare(b))
  return <CreateMedecinButton specialites={specialites} />
}

function ContentSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />
}

export default function MedecinsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: "Medex", href: "/dossiers" }, { label: "Administration" }, { label: "Médecins" }]} />}
        title="Médecins"
        description="Gérez votre équipe médicale et ses accès à l’application."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-44 rounded-lg" />}>
            <CreateMedecinAction />
          </Suspense>
        }

      />
      <Suspense fallback={<ContentSkeleton />}>
        <MedecinsContent />
      </Suspense>
    </>
  )
}
