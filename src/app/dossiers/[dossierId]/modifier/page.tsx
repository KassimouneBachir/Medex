import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { PatientForm } from "@/components/forms/patient-form"
import { FormSkeleton } from "@/components/forms/form-skeleton"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { QueryPanel } from "@/components/query-panel"
import { getDossier } from "@/lib/data"
import { patientToDraft } from "@/lib/drafts"
import { fullName } from "@/lib/format"

export const metadata: Metadata = { title: "Modifier le patient" }

async function EditView({ params }: { params: PageProps<"/dossiers/[dossierId]/modifier">["params"] }) {
  const { dossierId } = await params
  const { vue, entry } = await getDossier(decodeURIComponent(dossierId))
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
        description="Identité, antécédents et allergies : mise à jour du sous-document patient avec $set (et $unset si l'âge est vidé)."
        actions={<QueryPanel entries={[entry]} />}
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
