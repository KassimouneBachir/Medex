import { FormSkeleton } from "@/components/forms/form-skeleton"
import { PatientForm } from "@/components/forms/patient-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getDossier } from "@/lib/data"
import { patientToDraft } from "@/lib/drafts"
import { fullName } from "@/lib/format"

export const instant = false

export const metadata: Metadata = { title: "Modifier le patient" }

async function EditView({ params }: { params: PageProps<"/dossiers/[dossierId]/modifier">["params"] }) {
  const { dossierId } = await params
  const { vue } = await getDossier(decodeURIComponent(dossierId))
  if (!vue) notFound()
  const { dossier } = vue

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Medex", href: "/dossiers" },
              { label: "Dossiers", href: "/dossiers" },
              { label: dossier.dossierId, href: `/dossiers/${dossier.dossierId}` },
              { label: "Modifier" },
            ]}
          />
        }
        title={`Modifier ${fullName(dossier.patient)}`}
        description="Mettez à jour les informations personnelles et médicales de votre patient."

      />
      <PatientForm mode="edit" dossierId={dossier.dossierId} initial={patientToDraft(dossier.patient)} />
    </>
  )
}

export default function ModifierPage({ params }: PageProps<"/dossiers/[dossierId]/modifier">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditView params={params} />
    </Suspense>
  )
}
