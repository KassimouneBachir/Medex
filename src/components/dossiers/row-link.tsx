"use client"

import { useRouter } from "next/navigation"
import { TableRow } from "@/components/ui/table"

/** Ligne de tableau entièrement cliquable ; le nom du patient reste un vrai lien. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <TableRow
      className="group cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return
        router.push(href)
      }}
    >
      {children}
    </TableRow>
  )
}
