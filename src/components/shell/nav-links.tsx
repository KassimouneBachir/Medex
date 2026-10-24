"use client"

import { cn } from "@/lib/utils"
import { FolderOpenIcon, ListChecksIcon, StethoscopeIcon, UserPlusIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const SECTIONS = [
  {
    title: "Patients",
    links: [
      { href: "/dossiers", label: "Dossiers", icon: FolderOpenIcon, match: (p: string) => p.startsWith("/dossiers") && p !== "/dossiers/nouveau" },
      { href: "/dossiers/nouveau", label: "Nouveau dossier", icon: UserPlusIcon, match: (p: string) => p === "/dossiers/nouveau" },
    ],
  },
  {
    title: "Administration",
    links: [
      { href: "/medecins", label: "Médecins", icon: StethoscopeIcon, match: (p: string) => p.startsWith("/medecins") },
      { href: "/types-examens", label: "Types d'examen", icon: ListChecksIcon, match: (p: string) => p.startsWith("/types-examens") },
    ],
  },
]

function Links({ pathname, compact, role }: { pathname: string | null; compact?: boolean; role: "admin" | "medecin" }) {
  return (
    <>
      {SECTIONS.filter((section) => role === "admin" ? section.title === "Administration" : section.title === "Patients").map((section) => (
        <div key={section.title} className={cn(compact ? "contents" : "flex flex-col gap-0.5 pb-4")}>
          {!compact && (
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {section.title}
            </p>
          )}
          {section.links.map(({ href, label, icon: Icon, match }) => {
            const active = pathname ? match(pathname) : false
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={compact ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground",
                  compact && "px-2",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn(compact && "sr-only")}>{label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </>
  )
}

export function NavLinks({ compact, role }: { compact?: boolean; role: "admin" | "medecin" }) {
  return <Links pathname={usePathname()} compact={compact} role={role} />
}
