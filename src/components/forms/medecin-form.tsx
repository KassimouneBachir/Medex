"use client"

import { createMedecin } from "@/app/actions"
import { FormActions, FormSection, TextField, useWrite } from "@/components/forms/controls"
import { type MedecinDraft } from "@/lib/drafts"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const EMPTY: MedecinDraft = { nom: "", prenom: "", specialite: "" }

export function MedecinForm({ specialites, onSuccess, onCancel, onPendingChange }: {
  specialites: string[]
  onSuccess: () => void
  onCancel: () => void
  onPendingChange: (pending: boolean) => void
}) {
  const router = useRouter()
  const { error, pending, run } = useWrite()
  useEffect(() => onPendingChange(pending), [pending, onPendingChange])
  const [draft, setDraft] = useState(EMPTY)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const set = (k: keyof MedecinDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => createMedecin(draft, { email, password }),
          (id) => `Médecin ${id} ajouté`,
          () => {
            setDraft(EMPTY)
            setEmail("")
            setPassword("")
            router.refresh()
            onSuccess()
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
      <FormSection title="Informations du médecin">
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
      <FormSection title="Accès personnel" description="Transmettez ces identifiants au médecin après la création.">
        <div className="space-y-4">
          <TextField id="new-email" label="Adresse e-mail" type="email" autoComplete="off" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField id="new-password" label="Mot de passe initial" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} description="Au moins 12 caractères." />
        </div>
      </FormSection>
      <FormActions

        error={error}
        pending={pending}
        submitLabel="Ajouter"
        onCancel={onCancel}

      />
    </form>
  )
}
