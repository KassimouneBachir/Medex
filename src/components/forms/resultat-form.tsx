"use client"

import { saisirResultat } from "@/app/actions"
import { FormActions, FormSection, Repeatable, TextField, useWrite } from "@/components/forms/controls"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type ResultatDraft } from "@/lib/drafts"
import { formatExamen } from "@/lib/format"
import type { TypeExamen } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function ResultatForm({
  dossierId,
  consultationId,
  examenId,
  type,
  initial,
}: {
  dossierId: string
  consultationId: string
  examenId: string
  type: TypeExamen
  initial: ResultatDraft
}) {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  const [draft, setDraft] = useState(initial)
  const set = <K extends keyof ResultatDraft>(k: K, v: ResultatDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const setMesure = (i: number, patch: Partial<ResultatDraft["mesures"][number]>) =>
    set("mesures", draft.mesures.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const setCle = (i: number, patch: Partial<ResultatDraft["cles"][number]>) =>
    set("cles", draft.cles.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const description = {
    mesures: "Renseignez les valeurs mesurées et leurs unités.",
    cles: "Complétez les observations attendues pour cet examen.",
    imagerie: "Précisez la zone examinée, les images et les conclusions du compte rendu.",
  }[type.format]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => saisirResultat(dossierId, consultationId, examenId, draft),
          () => `Résultat ${examenId} enregistré`,
          () => router.push(`/dossiers/${dossierId}`),
        )
      }}
      className="max-w-3xl space-y-6"
    >
      <div className="min-w-0">
        <FormSection title={`Résultat · ${formatExamen(type.format).label}`} description={description}>
          {type.format === "mesures" && (
            <Repeatable
              items={draft.mesures}
              columns="grid-cols-[minmax(0,1fr)_7rem_6rem_auto]"
              addLabel="Ajouter une mesure"
              onAdd={() => set("mesures", [...draft.mesures, { parametre: "", valeur: "", unite: "" }])}
              onRemove={(i) => set("mesures", draft.mesures.filter((_, j) => j !== i))}
            >
              {(m, i) => (
                <>
                  <Input className="h-9" placeholder="Paramètre" aria-label="Paramètre" value={m.parametre} onChange={(e) => setMesure(i, { parametre: e.target.value })} />
                  <Input
                    className="h-9 tabular-nums"
                    placeholder="Valeur"
                    aria-label={`Valeur ${m.parametre}`}
                    inputMode="decimal"
                    required
                    value={m.valeur}
                    onChange={(e) => setMesure(i, { valeur: e.target.value })}
                  />
                  <Input className="h-9" placeholder="Unité" aria-label="Unité" value={m.unite} onChange={(e) => setMesure(i, { unite: e.target.value })} />
                </>
              )}
            </Repeatable>
          )}

          {type.format === "cles" && (
            <Repeatable
              items={draft.cles}
              columns="grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
              addLabel="Ajouter une observation"
              onAdd={() => set("cles", [...draft.cles, { cle: "", valeur: "" }])}
              onRemove={(i) => set("cles", draft.cles.filter((_, j) => j !== i))}
            >
              {(c, i) => (
                <>
                  <Input className="h-9 font-mono text-xs" placeholder="ex. Rythme cardiaque" aria-label="Observation" value={c.cle} onChange={(e) => setCle(i, { cle: e.target.value })} />
                  <Input
                    className="h-9"
                    placeholder="Valeur (nombre ou texte)"
                    aria-label={`Valeur ${c.cle}`}
                    value={c.valeur}
                    onChange={(e) => setCle(i, { valeur: e.target.value })}
                  />
                </>
              )}
            </Repeatable>
          )}

          {type.format === "imagerie" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="zone" label="Zone" placeholder="ex. Genou droit" value={draft.zone} onChange={(e) => set("zone", e.target.value)} />
              <Field>
                <FieldLabel htmlFor="images">Images</FieldLabel>
                <Textarea
                  id="images"
                  rows={2}
                  className="font-mono text-xs"
                  placeholder="Un nom de fichier par ligne"
                  value={draft.images}
                  onChange={(e) => set("images", e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="observations">Observations</FieldLabel>
                <Textarea id="observations" rows={3} value={draft.observations} onChange={(e) => set("observations", e.target.value)} />
              </Field>
              <TextField
                id="conclusion"
                label="Conclusion"
                className="sm:col-span-2"
                value={draft.conclusion}
                onChange={(e) => set("conclusion", e.target.value)}
              />
            </div>
          )}
        </FormSection>
      </div>

      <FormActions

        error={error}
        pending={pending}
        submitLabel="Enregistrer le résultat"
        onCancel={() => router.push(`/dossiers/${dossierId}`)}

      />
    </form>
  )
}
