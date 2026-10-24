"use client"
import { login } from "@/app/auth-actions"
import { TextField } from "@/components/forms/controls"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"
import { useActionState } from "react"
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" })
  return <form action={action} className="space-y-5">
    <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="username" required maxLength={254} placeholder="vous@cabinet.fr" />
    <TextField id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" required maxLength={128} />
    {state.error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
    <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />}Se connecter</Button>
    <p className="text-center text-xs leading-relaxed text-muted-foreground">Besoin d’un accès ou d’un nouveau mot de passe ?<br />Contactez l’administrateur de votre établissement.</p>
  </form>
}
