"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { planifierConsultation } from "@/app/actions"
import { ChoiceSelect, FormSection, QueryPreview, Repeatable, TextField, useWrite } from "@/components/forms/controls"
import { Mono } from "@/components/pill"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { COLLECTION_NAME } from "@/lib/constants"
import { draftToPlannedConsultation, type PlanningDraft } from "@/lib/drafts"
import { formatExamen, TYPES_CONSULTATION } from "@/lib/format"
import { shellCall } from "@/lib/shell"
import type { Medecin, TypeExamen } from "@/lib/types"

export function PlanningForm({
  dossierId,
  today,
  medecins,
  types,
}: {
  dossierId: string
  today: string
  medecins: Medecin[]
  types: TypeExamen[]
}) {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  const [draft, setDraft] = useState<PlanningDraft>({ date: today, type: "initiale", medecinId: "", motif: "", examens: [] })
  const set = <K extends keyof PlanningDraft>(k: K, v: PlanningDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const shell = shellCall(COLLECTION_NAME, "updateOne", { dossierId }, { $push: { consultations: draftToPlannedConsultation(draft) } })
  const medecinItems = medecins.map((m) => ({ value: m.medecinId, label: `Dr ${m.prenom} ${m.nom} · ${m.specialite}` }))
  const typeItems = types.map((x) => ({ value: x.typeExamenId, label: `${x.nom} · ${x.domaine} (${formatExamen(x.format).label.toLowerCase()})` }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => planifierConsultation(dossierId, draft),
          () => "Consultation planifiée",
          () => router.push(`/dossiers/${dossierId}`),
        )
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem]"
    >
      <div className="min-w-0 space-y-6">
        <FormSection title="Rendez-vous" description="La consultation est créée avec le statut « planifiee ».">
          <div className="grid gap-4 sm:grid-cols-[10rem_10rem_minmax(0,1fr)]">
            <TextField id="date" label="Date" type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />
            <Field>
              <FieldLabel htmlFor="type">Type</FieldLabel>
              <ChoiceSelect id="type" items={TYPES_CONSULTATION} value={draft.type} onChange={(v) => set("type", v)} />
            </Field>
            <TextField id="motif" label="Motif" required placeholder="ex. Toux persistante" value={draft.motif} onChange={(e) => set("motif", e.target.value)} />
          </div>
        </FormSection>

        <FormSection
          title="Médecin"
          description={
            <>
              Seul l&apos;identifiant est stocké dans la consultation : référence vers la collection{" "}
              <code className="font-mono">medecins</code>.
            </>
          }
          action={
            <Link href="/medecins" className="text-xs font-medium text-primary hover:underline">
              Gérer les médecins
            </Link>
          }
        >
          <Field>
            <FieldLabel htmlFor="medecin">Médecin</FieldLabel>
            <ChoiceSelect
              id="medecin"
              placeholder="Choisir un médecin…"
              items={medecinItems}
              value={draft.medecinId || null}
              onChange={(v) => set("medecinId", v)}
            />
            {draft.medecinId && (
              <FieldDescription className="text-xs">
                Stocké : <Mono className="text-foreground">medecinId: &apos;{draft.medecinId}&apos;</Mono>
              </FieldDescription>
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Examens prévus"
          description="Chaque examen ne stocke que son typeExamenId et le statut « planifie » ; le médecin saisira le résultat."
          action={
            <Link href="/types-examens" className="text-xs font-medium text-primary hover:underline">
              Catalogue
            </Link>
          }
        >
          <Repeatable
            items={draft.examens}
            columns="grid-cols-[minmax(0,1fr)_auto]"
            addLabel="Prévoir un examen"
            empty="Aucun examen prévu."
            onAdd={() => set("examens", [...draft.examens, ""])}
            onRemove={(i) => set("examens", draft.examens.filter((_, j) => j !== i))}
          >
            {(typeId, i) => (
              <ChoiceSelect
                aria-label="Type d'examen"
                placeholder="Choisir dans le catalogue…"
                items={typeItems}
                value={typeId || null}
                onChange={(v) => set("examens", draft.examens.map((x, j) => (j === i ? v : x)))}
              />
            )}
          </Repeatable>
        </FormSection>
      </div>

      <QueryPreview
        shell={shell}
        error={error}
        pending={pending}
        submitLabel="Planifier"
        onCancel={() => router.push(`/dossiers/${dossierId}`)}
        note={
          <>
            <code className="font-mono">consultationId</code> et <code className="font-mono">examenId</code> sont
            attribués par le serveur, qui vérifie aussi que le médecin et les types d&apos;examen existent.
          </>
        }
      />
    </form>
  )
}
