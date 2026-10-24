"use client"

import { completerConsultation } from "@/app/actions"
import { ChoiceSelect, FormActions, FormSection, Repeatable, useWrite } from "@/components/forms/controls"
import { Input } from "@/components/ui/input"
import { type CompletionDraft } from "@/lib/drafts"
import { INTENSITES, STATUTS_DIAGNOSTIC } from "@/lib/format"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function CompletionForm({
  dossierId,
  consultationId,
  initial,
}: {
  dossierId: string
  consultationId: string
  initial: CompletionDraft
}) {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  const [draft, setDraft] = useState(initial)

  const setSymptome = (i: number, patch: Partial<CompletionDraft["symptomes"][number]>) =>
    setDraft((d) => ({ ...d, symptomes: d.symptomes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
  const setDiagnostic = (i: number, patch: Partial<CompletionDraft["diagnostics"][number]>) =>
    setDraft((d) => ({ ...d, diagnostics: d.diagnostics.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => completerConsultation(dossierId, consultationId, draft),
          () => `Consultation ${consultationId} complétée`,
          () => router.push(`/dossiers/${dossierId}`),
        )
      }}
      className="max-w-3xl space-y-6"
    >
      <div className="min-w-0 space-y-6">
        <FormSection title="Symptômes">
          <Repeatable
            items={draft.symptomes}
            columns="grid-cols-[minmax(0,1fr)_7rem_8rem_auto]"
            addLabel="Ajouter un symptôme"
            empty="Aucun symptôme."
            onAdd={() => setDraft((d) => ({ ...d, symptomes: [...d.symptomes, { nom: "", duree: "", intensite: "moderee" }] }))}
            onRemove={(i) => setDraft((d) => ({ ...d, symptomes: d.symptomes.filter((_, j) => j !== i) }))}
          >
            {(s, i) => (
              <>
                <Input className="h-9" placeholder="Symptôme" aria-label="Symptôme" value={s.nom} onChange={(e) => setSymptome(i, { nom: e.target.value })} />
                <Input className="h-9" placeholder="Durée" aria-label="Durée" value={s.duree} onChange={(e) => setSymptome(i, { duree: e.target.value })} />
                <ChoiceSelect aria-label="Intensité" items={INTENSITES} value={s.intensite} onChange={(intensite) => setSymptome(i, { intensite })} />
              </>
            )}
          </Repeatable>
        </FormSection>

        <FormSection title="Diagnostics">
          <Repeatable
            items={draft.diagnostics}
            columns="grid-cols-[minmax(0,1fr)_9rem_auto]"
            addLabel="Ajouter un diagnostic"
            empty="Aucun diagnostic."
            onAdd={() => setDraft((d) => ({ ...d, diagnostics: [...d.diagnostics, { nom: "", statut: "suspecte" }] }))}
            onRemove={(i) => setDraft((d) => ({ ...d, diagnostics: d.diagnostics.filter((_, j) => j !== i) }))}
          >
            {(x, i) => (
              <>
                <Input className="h-9" placeholder="Diagnostic" aria-label="Diagnostic" value={x.nom} onChange={(e) => setDiagnostic(i, { nom: e.target.value })} />
                <ChoiceSelect aria-label="Statut" items={STATUTS_DIAGNOSTIC} value={x.statut} onChange={(statut) => setDiagnostic(i, { statut })} />
              </>
            )}
          </Repeatable>
        </FormSection>
      </div>

      <FormActions

        error={error}
        pending={pending}
        submitLabel="Valider la consultation"
        onCancel={() => router.push(`/dossiers/${dossierId}`)}

      />
    </form>
  )
}
