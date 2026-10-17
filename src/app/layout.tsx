import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { Brand, Logo } from "@/components/shell/brand"
import { DbStatus, DbStatusSkeleton } from "@/components/shell/db-status"
import { NavLinks, NavLinksFallback } from "@/components/shell/nav-links"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Medex", template: "%s · Medex" },
  description: "Gestion de dossiers médicaux sur MongoDB : Next.js et driver natif.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        <TooltipProvider>
          <div className="flex min-h-svh">
            <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
              <div className="px-4 pt-5 pb-6">
                <Brand />
              </div>
              <nav className="flex flex-col px-3">
                <Suspense fallback={<NavLinksFallback />}>
                  <NavLinks />
                </Suspense>
              </nav>
              <div className="mt-auto p-3">
                <Suspense fallback={<DbStatusSkeleton />}>
                  <DbStatus />
                </Suspense>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-sidebar/90 px-4 backdrop-blur md:hidden">
                <Logo className="size-7" />
                <span className="font-semibold tracking-tight">Medex</span>
                <nav className="ml-auto flex items-center gap-1">
                  <Suspense fallback={<NavLinksFallback compact />}>
                    <NavLinks compact />
                  </Suspense>
                </nav>
              </header>
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
            </div>
          </div>
        </TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
