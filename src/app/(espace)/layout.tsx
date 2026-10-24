import { logout } from "@/app/auth-actions"
import { Brand } from "@/components/shell/brand"
import { NavLinks } from "@/components/shell/nav-links"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { LogOutIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

export const instant = false

async function Workspace({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="px-5 pt-6 pb-8"><Brand href={user.role === "admin" ? "/medecins" : "/dossiers"} /></div>
        <nav className="flex flex-col px-3"><NavLinks role={user.role} /></nav>
        <div className="mt-auto space-y-3 border-t p-4">
          <Link href="/compte" className="flex items-center gap-2 text-sm hover:text-primary"><UserRoundIcon className="size-4" /><span className="truncate">{user.name}</span></Link>
          <p className="text-xs text-muted-foreground">{user.role === "admin" ? "Administrateur" : "Médecin"}</p>
          <form action={logout}><Button type="submit" variant="outline" size="sm" className="w-full"><LogOutIcon />Se déconnecter</Button></form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b bg-sidebar p-3 md:hidden">
          <Brand href={user.role === "admin" ? "/medecins" : "/dossiers"} />
          <nav className="flex flex-wrap gap-1"><NavLinks role={user.role} compact /></nav>
          <Link href="/compte" className="ml-auto text-sm">Mon compte</Link>
          <form action={logout}><Button type="submit" variant="ghost" size="icon" aria-label="Se déconnecter"><LogOutIcon /></Button></form>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Chargement de votre espace…</div>}><Workspace>{children}</Workspace></Suspense>
}
