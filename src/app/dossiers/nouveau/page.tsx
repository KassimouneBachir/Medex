import type { Metadata } from "next"
import { PatientForm } from "@/components/forms/patient-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { emptyPatientDraft } from "@/lib/drafts"

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
        description="Crée un document dans la collection avec un tableau de consultations vide."
      />
      <PatientForm mode="create" initial={emptyPatientDraft()} />
    </>
  )
}
