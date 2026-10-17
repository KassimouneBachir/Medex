"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMedecin } from "@/app/actions"
import { FormSection, QueryPreview, TextField, useWrite } from "@/components/forms/controls"
import { COLLECTIONS } from "@/lib/constants"
import { AUTO_ID, draftToMedecin, type MedecinDraft } from "@/lib/drafts"
import { shellCall } from "@/lib/shell"

const EMPTY: MedecinDraft = { nom: "", prenom: "", specialite: "" }

export function MedecinForm({ specialites }: { specialites: string[] }) {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  const [draft, setDraft] = useState(EMPTY)
  const set = (k: keyof MedecinDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const shell = shellCall(COLLECTIONS.medecins, "insertOne", { medecinId: AUTO_ID, ...draftToMedecin(draft) })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => createMedecin(draft),
          (id) => `Médecin ${id} ajouté`,
          () => {
            setDraft(EMPTY)
            router.refresh()
          },
        )
      }}
      className="space-y-4"
    >
      <datalist id="specialites">
        {specialites.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <FormSection title="Ajouter un médecin" description="Un document dans la collection medecins.">
        <div className="grid gap-4">
          <TextField id="m-nom" label="Nom" required value={draft.nom} onChange={(e) => set("nom", e.target.value)} />
          <TextField id="m-prenom" label="Prénom" required value={draft.prenom} onChange={(e) => set("prenom", e.target.value)} />
          <TextField
            id="m-specialite"
            label="Spécialité"
            list="specialites"
            required
            value={draft.specialite}
            onChange={(e) => set("specialite", e.target.value)}
          />
        </div>
      </FormSection>
      <QueryPreview
        shell={shell}
        error={error}
        pending={pending}
        submitLabel="Ajouter"
        onCancel={() => setDraft(EMPTY)}
        note={<>Le <code className="font-mono">medecinId</code> est attribué par le serveur (MED + numéro suivant).</>}
      />
    </form>
  )
}
