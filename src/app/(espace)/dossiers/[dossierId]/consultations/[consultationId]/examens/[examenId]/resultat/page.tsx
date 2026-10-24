import { DomaineIcon } from "@/components/dossiers/examen-view"
import { FormSkeleton } from "@/components/forms/form-skeleton"
import { ResultatForm } from "@/components/forms/resultat-form"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { Mono } from "@/components/pill"
import { requireRole } from "@/lib/auth"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"

import { getDossier } from "@/lib/data"
import { resultatToDraft } from "@/lib/drafts"
import { formatDate, fullName, nomMedecin } from "@/lib/format"

export const instant = false

export const metadata: Metadata = { title: "Saisir un résultat" }

type Route = "/dossiers/[dossierId]/consultations/[consultationId]/examens/[examenId]/resultat"

async function ResultatView({ params }: { params: PageProps<Route>["params"] }) {
  const user = await requireRole("medecin")
  const { dossierId, consultationId, examenId } = await params
  const { vue } = await getDossier(decodeURIComponent(dossierId))
  const consultation = vue?.dossier.consultations.find((c) => c.consultationId === consultationId)
  const examen = consultation?.examens.find((e) => e.examenId === examenId)
  const type = examen && vue?.types[examen.typeExamenId]
  if (!vue || !consultation || !examen || !type) notFound()
  if (consultation.medecinId !== user.medecinId) notFound()
  const { dossier } = vue

  await connection()

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Medex", href: "/dossiers" },
              { label: "Dossiers", href: "/dossiers" },
              { label: dossier.dossierId, href: `/dossiers/${dossier.dossierId}` },
              { label: `${examenId} · résultat` },
            ]}
          />
        }
        leading={<DomaineIcon domaine={type.domaine} className="size-11 rounded-xl [&_svg]:size-5" />}
        title={type.nom}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{fullName(dossier.patient)}</span>
            <span aria-hidden>·</span>
            <span>
              consultation du {formatDate(consultation.date)}, {nomMedecin(vue.medecins[consultation.medecinId], consultation.medecinId)}
            </span>
            <span aria-hidden>·</span>
            <Mono>
              {examenId} → {type.typeExamenId}
            </Mono>
          </span>
        }

      />
      <ResultatForm
        dossierId={dossier.dossierId}
        consultationId={consultationId}
        examenId={examenId}
        type={type}
        initial={resultatToDraft(type, examen.statut === "realise" ? examen : undefined)}
      />
    </>
  )
}

export default function ResultatPage({ params }: PageProps<Route>) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ResultatView params={params} />
    </Suspense>
  )
}
