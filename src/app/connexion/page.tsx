import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/shell/brand"
import { currentUser } from "@/lib/auth"
import { homeFor } from "@/lib/auth-core.mjs"
import { HeartPulseIcon, ShieldCheckIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { Suspense } from "react"
export const metadata = { title: "Connexion" }
export const instant = false
async function Login({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await currentUser()
  if (user) redirect(homeFor(user))
  const params = await searchParams
  return <main className="grid min-h-svh lg:grid-cols-2">
    <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
      <div className="flex items-center gap-3 text-xl font-semibold"><HeartPulseIcon className="size-8" />Medex</div>
      <div className="max-w-lg space-y-6"><span className="text-sm font-medium uppercase tracking-widest opacity-75">Votre espace médical</span><h1 className="text-5xl font-semibold leading-tight tracking-tight">Le suivi de vos patients,<br />en toute simplicité.</h1><p className="text-lg leading-relaxed opacity-80">Retrouvez vos dossiers, préparez vos consultations et suivez les résultats de vos examens dans un seul espace.</p></div>
      <p className="flex items-center gap-2 text-sm opacity-80"><ShieldCheckIcon className="size-4" />Un accès personnel pour chaque professionnel.</p>
    </section>
    <section className="flex items-center justify-center bg-background px-6 py-12"><div className="w-full max-w-sm space-y-8">
      <div className="space-y-5"><Logo className="size-11" /><div><h2 className="text-3xl font-semibold tracking-tight">Bienvenue sur Medex</h2><p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour accéder à votre espace.</p></div></div>
      {params.password === "updated" && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.</p>}
      <LoginForm />
    </div></section>
  </main>
}
export default function Page({ searchParams }: { searchParams: Promise<{ password?: string }> }) { return <Suspense fallback={<div className="p-8">Chargement…</div>}><Login searchParams={searchParams} /></Suspense> }
