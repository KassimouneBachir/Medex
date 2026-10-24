import { PatientForm } from "@/components/forms/patient-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { emptyPatientDraft } from "@/lib/drafts"
import type { Metadata } from "next"

export const instant = false

export const metadata: Metadata = { title: "Nouveau dossier" }

export default function NouveauDossierPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Medex", href: "/dossiers" }, { label: "Dossiers", href: "/dossiers" }, { label: "Nouveau" }]}
          />
        }
        title="Nouveau dossier"
        description="Renseignez les informations du patient pour commencer son suivi."
      />
      <PatientForm mode="create" initial={emptyPatientDraft()} />
    </>
  )
}
