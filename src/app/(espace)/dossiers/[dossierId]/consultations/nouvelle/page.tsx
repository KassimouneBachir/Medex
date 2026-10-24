import { FormSkeleton } from "@/components/forms/form-skeleton"
import { PlanningForm } from "@/components/forms/planning-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"

import { getDossier, listMedecins, listTypesExamens } from "@/lib/data"
import { aujourdhui, fullName } from "@/lib/format"

export const instant = false

export const metadata: Metadata = { title: "Planifier une consultation" }

type Params = PageProps<"/dossiers/[dossierId]/consultations/nouvelle">["params"]

async function PlanningView({ params }: { params: Params }) {
  const { dossierId } = await params
  const [{ vue }, medecins, types] = await Promise.all([
    getDossier(decodeURIComponent(dossierId)),
    listMedecins(),
    listTypesExamens(),
  ])
  if (!vue) notFound()
  const { dossier } = vue

  // Date du jour calculée au moment de la requête (et non au build).
  await connection()
  const today = aujourdhui()

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Medex", href: "/dossiers" },
              { label: "Dossiers", href: "/dossiers" },
              { label: dossier.dossierId, href: `/dossiers/${dossier.dossierId}` },
              { label: "Planifier" },
            ]}
          />
        }
        title="Planifier une consultation"
        description={`Préparer un rendez-vous pour ${fullName(dossier.patient)}.`}

      />
      <PlanningForm dossierId={dossier.dossierId} today={today} medecins={medecins.medecins} types={types.types} />
    </>
  )
}

export default function PlanifierPage({ params }: PageProps<"/dossiers/[dossierId]/consultations/nouvelle">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <PlanningView params={params} />
    </Suspense>
  )
}
