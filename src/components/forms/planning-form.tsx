"use client"

import { planifierConsultation } from "@/app/actions"
import { ChoiceSelect, FormActions, FormSection, Repeatable, TextField, useWrite } from "@/components/forms/controls"
import { Field, FieldLabel } from "@/components/ui/field"
import { type PlanningDraft } from "@/lib/drafts"
import { TYPES_CONSULTATION } from "@/lib/format"
import type { Medecin, TypeExamen } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
  const [draft, setDraft] = useState<PlanningDraft>({ date: today, type: "initiale", medecinId: medecins[0]?.medecinId ?? "", motif: "", examens: [] })
  const set = <K extends keyof PlanningDraft>(k: K, v: PlanningDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const medecinItems = medecins.map((m) => ({ value: m.medecinId, label: `Dr ${m.prenom} ${m.nom} · ${m.specialite}` }))
  const typeItems = types.map((t) => ({ value: t.typeExamenId, label: t.nom }))

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
      className="max-w-3xl space-y-6"
    >
      <div className="min-w-0 space-y-6">
        <FormSection title="Rendez-vous" description="Choisissez une date et précisez le motif de la consultation.">
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
          description="La consultation sera attribuée à votre compte."

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

          </Field>
        </FormSection>

        <FormSection
          title="Examens prévus"
          description="Choisissez les examens à réaliser pour ce patient."

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

      <FormActions

        error={error}
        pending={pending}
        submitLabel="Planifier"
        onCancel={() => router.push(`/dossiers/${dossierId}`)}

      />
    </form>
  )
}
