"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createDossier, updatePatient } from "@/app/actions"
import { ChoiceSelect, FormSection, QueryPreview, Repeatable, TextField } from "@/components/forms/controls"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { COLLECTION_NAME } from "@/lib/constants"
import { AUTO_ID, draftToPatient, patientUpdate, type PatientDraft } from "@/lib/drafts"
import { GROUPES_SANGUINS, SEVERITES, SEXES, TYPES_ANTECEDENT } from "@/lib/format"
import { notifyWrite } from "@/lib/notify"
import { shellCall } from "@/lib/shell"

type ListKey = "allergies" | "antecedents"

export function PatientForm({ mode, dossierId, initial }: { mode: "create" | "edit"; dossierId?: string; initial: PatientDraft }) {
  const router = useRouter()
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = <K extends keyof PatientDraft>(k: K, v: PatientDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setRow = <K extends ListKey>(k: K, i: number, patch: Partial<PatientDraft[K][number]>) =>
    set(k, draft[k].map((row, j) => (j === i ? { ...row, ...patch } : row)) as PatientDraft[K])

  const patient = draftToPatient(draft)
  const shell =
    mode === "create"
      ? shellCall(COLLECTION_NAME, "insertOne", { dossierId: AUTO_ID, patient, consultations: [] })
      : shellCall(COLLECTION_NAME, "updateOne", { dossierId }, patientUpdate(patient))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = mode === "create" ? await createDossier(draft) : await updatePatient(dossierId!, draft)
      if (!res.ok) {
        setError(res.error)
        toast.error("Écriture refusée", { description: res.error })
        return
      }
      notifyWrite(res, mode === "create" ? `Dossier ${res.id} créé` : "Patient mis à jour")
      router.push(`/dossiers/${res.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-6">
        <FormSection title="Identité" description="Sous-document patient du dossier.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="nom" label="Nom" required value={draft.nom} onChange={(e) => set("nom", e.target.value)} autoComplete="off" />
            <TextField id="prenom" label="Prénom" required value={draft.prenom} onChange={(e) => set("prenom", e.target.value)} autoComplete="off" />
            <TextField
              id="dateNaissance"
              label="Date de naissance"
              type="date"
              required
              value={draft.dateNaissance}
              onChange={(e) => set("dateNaissance", e.target.value)}
            />
            <TextField
              id="age"
              label="Âge"
              type="number"
              min={0}
              max={130}
              inputMode="numeric"
              value={draft.age}
              onChange={(e) => set("age", e.target.value)}
              description={
                <>
                  Optionnel, stocké tel quel dans <code className="font-mono">patient.age</code>.
                </>
              }
            />
            <Field>
              <FieldLabel htmlFor="sexe">Sexe</FieldLabel>
              <ChoiceSelect id="sexe" items={SEXES} value={draft.sexe} onChange={(v) => set("sexe", v as "M" | "F")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="groupe">Groupe sanguin</FieldLabel>
              <ChoiceSelect
                id="groupe"
                items={GROUPES_SANGUINS.map((g) => ({ value: g, label: g }))}
                value={draft.groupeSanguin}
                onChange={(v) => set("groupeSanguin", v)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Antécédents" description="Tableau d'objets { type, description, annee }.">
          <Repeatable
            items={draft.antecedents}
            columns="grid-cols-[8.5rem_minmax(0,1fr)_5.5rem_auto]"
            addLabel="Ajouter un antécédent"
            empty="Aucun antécédent renseigné."
            onAdd={() => set("antecedents", [...draft.antecedents, { type: "medical", description: "", annee: "" }])}
            onRemove={(i) => set("antecedents", draft.antecedents.filter((_, j) => j !== i))}
          >
            {(a, i) => (
              <>
                <ChoiceSelect
                  aria-label="Type d'antécédent"
                  items={TYPES_ANTECEDENT}
                  value={a.type}
                  onChange={(type) => setRow("antecedents", i, { type })}
                />
                <Input
                  className="h-9"
                  placeholder="Description (ex. Appendicectomie)"
                  aria-label="Description"
                  value={a.description}
                  onChange={(e) => setRow("antecedents", i, { description: e.target.value })}
                />
                <Input
                  className="h-9"
                  placeholder="Année"
                  aria-label="Année"
                  inputMode="numeric"
                  value={a.annee}
                  onChange={(e) => setRow("antecedents", i, { annee: e.target.value })}
                />
              </>
            )}
          </Repeatable>
        </FormSection>

        <FormSection title="Allergies" description="Tableau d'objets { substance, severite }.">
          <Repeatable
            items={draft.allergies}
            columns="grid-cols-[minmax(0,1fr)_9rem_auto]"
            addLabel="Ajouter une allergie"
            empty="Aucune allergie : le tableau sera vide ([])."
            onAdd={() => set("allergies", [...draft.allergies, { substance: "", severite: "moderee" }])}
            onRemove={(i) => set("allergies", draft.allergies.filter((_, j) => j !== i))}
          >
            {(a, i) => (
              <>
                <Input
                  className="h-9"
                  placeholder="Substance (ex. Pénicilline)"
                  aria-label="Substance"
                  value={a.substance}
                  onChange={(e) => setRow("allergies", i, { substance: e.target.value })}
                />
                <ChoiceSelect
                  aria-label="Sévérité"
                  items={SEVERITES}
                  value={a.severite}
                  onChange={(severite) => setRow("allergies", i, { severite })}
                />
              </>
            )}
          </Repeatable>
        </FormSection>
      </div>

      <QueryPreview
        shell={shell}
        error={error}
        pending={pending}
        submitLabel={mode === "create" ? "Créer le dossier" : "Enregistrer"}
        onCancel={() => router.push(mode === "create" ? "/dossiers" : `/dossiers/${dossierId}`)}
        note={
          mode === "create" ? (
            <>Le <code className="font-mono">dossierId</code> est attribué par le serveur (DM + numéro suivant).</>
          ) : undefined
        }
      />
    </form>
  )
}
