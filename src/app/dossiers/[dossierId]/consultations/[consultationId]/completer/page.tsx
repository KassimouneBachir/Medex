import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CompletionForm } from "@/components/forms/completion-form"
import { FormSkeleton } from "@/components/forms/form-skeleton"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { QueryPanel } from "@/components/query-panel"
import { getDossier } from "@/lib/data"
import { formatDate, fullName, nomMedecin } from "@/lib/format"

export const metadata: Metadata = { title: "Compléter la consultation" }

type Params = PageProps<"/dossiers/[dossierId]/consultations/[consultationId]/completer">["params"]

async function CompletionView({ params }: { params: Params }) {
  const { dossierId, consultationId } = await params
  const { vue, entry } = await getDossier(decodeURIComponent(dossierId))
  const consultation = vue?.dossier.consultations.find((c) => c.consultationId === consultationId)
  if (!vue || !consultation) notFound()
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
              { label: `${consultationId} · compléter` },
            ]}
          />
        }
        title={consultation.motif}
        description={
          <>
            {fullName(dossier.patient)} · {formatDate(consultation.date)} ·{" "}
            {nomMedecin(vue.medecins[consultation.medecinId], consultation.medecinId)}
          </>
        }
        actions={<QueryPanel entries={[entry]} />}
      />
      <CompletionForm
        dossierId={dossier.dossierId}
        consultationId={consultationId}
        initial={{ symptomes: consultation.symptomes, diagnostics: consultation.diagnostics }}
      />
    </>
  )
}

export default function CompleterPage({ params }: PageProps<"/dossiers/[dossierId]/consultations/[consultationId]/completer">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <CompletionView params={params} />
    </Suspense>
  )
}
