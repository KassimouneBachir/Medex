"use client"

import { createDoctorAccess, updateDoctorAccess } from "@/app/admin-actions"
import { TextField, useWrite } from "@/components/forms/controls"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export type DoctorAccess = { id: string; email: string; active: boolean }

export function DoctorAccessForm({ medecinId, account }: { medecinId: string; account?: DoctorAccess }) {
  const router = useRouter()
  const { run, pending, error } = useWrite()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [open, setOpen] = useState(false)
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{account ? `${account.email} · ${account.active ? "Accès actif" : "Accès suspendu"}` : "Aucun accès configuré"}</span>
      <Button size="xs" variant="outline" onClick={() => setOpen(!open)}>{account ? "Gérer l’accès" : "Créer un accès"}</Button>
    </div>
    {open && <form className="max-w-sm space-y-3 rounded-lg border bg-background p-3" onSubmit={(e) => {
      e.preventDefault()
      run(() => account ? updateDoctorAccess(account.id, account.active, password) : createDoctorAccess(medecinId, email, password), () => account ? "Mot de passe réinitialisé" : "Accès créé", () => { setPassword(""); setEmail(""); setOpen(false); router.refresh() })
    }}>
      {!account && <TextField id={`email-${medecinId}`} label="Adresse e-mail" type="email" autoComplete="off" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />}
      <TextField id={`password-${medecinId}`} label={account ? "Nouveau mot de passe" : "Mot de passe initial"} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} description="Au moins 12 caractères. À transmettre au médecin." />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button size="sm" type="submit" disabled={pending}>{account ? "Réinitialiser" : "Créer l’accès"}</Button>
      {account && <Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => run(() => updateDoctorAccess(account.id, !account.active, ""), () => account.active ? "Accès suspendu" : "Accès réactivé", () => { setOpen(false); router.refresh() })}>{account.active ? "Suspendre l’accès" : "Réactiver l’accès"}</Button>}</div>
    </form>}
  </div>
}
