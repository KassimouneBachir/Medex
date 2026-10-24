import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
export const metadata: Metadata = {
  title: { default: "Medex", template: "%s · Medex" },
  description: "Votre espace de suivi des patients et des consultations.",
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}><body className="min-h-full"><TooltipProvider>{children}</TooltipProvider><Toaster position="bottom-right" richColors closeButton /></body></html>
}
