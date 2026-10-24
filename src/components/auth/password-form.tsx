"use client"
import { changePassword } from "@/app/auth-actions"
import { TextField } from "@/components/forms/controls"
import { Button } from "@/components/ui/button"
import { useActionState } from "react"
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, { error: "" })
  return <form action={action} className="max-w-md space-y-4 rounded-xl border bg-card p-6">
    <h2 className="font-semibold">Changer mon mot de passe</h2>
    <TextField id="currentPassword" name="currentPassword" type="password" label="Mot de passe actuel" autoComplete="current-password" required maxLength={128} />
    <TextField id="password" name="password" type="password" label="Nouveau mot de passe" autoComplete="new-password" required minLength={12} maxLength={128} description="Au moins 12 caractères." />
    <TextField id="confirmation" name="confirmation" type="password" label="Confirmer le nouveau mot de passe" autoComplete="new-password" required minLength={12} maxLength={128} />
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <p className="text-xs text-muted-foreground">Vous devrez vous reconnecter sur vos appareils après cette modification.</p>
    <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Modifier le mot de passe"}</Button>
  </form>
}
