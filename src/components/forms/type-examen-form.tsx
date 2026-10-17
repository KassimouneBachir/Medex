"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createTypeExamen } from "@/app/actions"
import { ChoiceSelect, FormSection, QueryPreview, Repeatable, TextField, useWrite } from "@/components/forms/controls"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { COLLECTIONS } from "@/lib/constants"
import { AUTO_ID, draftToTypeExamen, emptyTypeExamenDraft, type TypeExamenDraft } from "@/lib/drafts"
import { DOMAINES_EXAMEN, FORMATS_EXAMEN } from "@/lib/format"
import { shellCall } from "@/lib/shell"
import type { FormatExamen } from "@/lib/types"

export function TypeExamenForm() {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  const [draft, setDraft] = useState(emptyTypeExamenDraft)
  const set = <K extends keyof TypeExamenDraft>(k: K, v: TypeExamenDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const shell = shellCall(COLLECTIONS.typesExamens, "insertOne", { typeExamenId: AUTO_ID, ...draftToTypeExamen(draft) })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => createTypeExamen(draft),
          (id) => `Type d'examen ${id} ajouté`,
          () => {
            setDraft(emptyTypeExamenDraft())
            router.refresh()
          },
        )
      }}
      className="space-y-4"
    >
      <datalist id="domaines">
        {DOMAINES_EXAMEN.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <FormSection title="Ajouter un type d'examen" description="Un document dans la collection typesExamens.">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="t-domaine" label="Domaine" list="domaines" required value={draft.domaine} onChange={(e) => set("domaine", e.target.value)} />
            <TextField id="t-categorie" label="Catégorie" placeholder="ex. biochimie" value={draft.categorie} onChange={(e) => set("categorie", e.target.value)} />
          </div>
          <TextField id="t-nom" label="Nom" required placeholder="ex. Ionogramme" value={draft.nom} onChange={(e) => set("nom", e.target.value)} />
          <Field>
            <FieldLabel htmlFor="t-format">Format des résultats</FieldLabel>
            <ChoiceSelect
              id="t-format"
              items={FORMATS_EXAMEN}
              value={draft.format}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  format: v as FormatExamen,
                  champs: v === "cles" && !d.champs.length ? [{ nom: "" }] : d.champs,
                  parametres: v === "mesures" && !d.parametres.length ? [{ parametre: "", unite: "" }] : d.parametres,
                }))
              }
            />
            <FieldDescription className="text-xs">Détermine le formulaire de saisie du résultat pour ce type.</FieldDescription>
          </Field>

          {draft.format === "mesures" && (
            <Field>
              <FieldLabel>Paramètres attendus</FieldLabel>
              <Repeatable
                items={draft.parametres}
                columns="grid-cols-[minmax(0,1fr)_6rem_auto]"
                addLabel="Ajouter un paramètre"
                onAdd={() => set("parametres", [...draft.parametres, { parametre: "", unite: "" }])}
                onRemove={(i) => set("parametres", draft.parametres.filter((_, j) => j !== i))}
              >
                {(p, i) => (
                  <>
                    <Input className="h-9" placeholder="Paramètre" aria-label="Paramètre" value={p.parametre} onChange={(e) => set("parametres", draft.parametres.map((x, j) => (j === i ? { ...x, parametre: e.target.value } : x)))} />
                    <Input className="h-9" placeholder="Unité" aria-label="Unité" value={p.unite} onChange={(e) => set("parametres", draft.parametres.map((x, j) => (j === i ? { ...x, unite: e.target.value } : x)))} />
                  </>
                )}
              </Repeatable>
            </Field>
          )}

          {draft.format === "cles" && (
            <Field>
              <FieldLabel>Champs attendus</FieldLabel>
              <Repeatable
                items={draft.champs}
                columns="grid-cols-[minmax(0,1fr)_auto]"
                addLabel="Ajouter un champ"
                onAdd={() => set("champs", [...draft.champs, { nom: "" }])}
                onRemove={(i) => set("champs", draft.champs.filter((_, j) => j !== i))}
              >
                {(c, i) => (
                  <Input className="h-9 font-mono text-xs" placeholder="nomDuChamp" aria-label="Champ" value={c.nom} onChange={(e) => set("champs", draft.champs.map((x, j) => (j === i ? { nom: e.target.value } : x)))} />
                )}
              </Repeatable>
            </Field>
          )}
        </div>
      </FormSection>
      <QueryPreview
        shell={shell}
        error={error}
        pending={pending}
        submitLabel="Ajouter"
        onCancel={() => setDraft(emptyTypeExamenDraft())}
        note={<>Le <code className="font-mono">typeExamenId</code> est attribué par le serveur (TE + numéro suivant).</>}
      />
    </form>
  )
}
