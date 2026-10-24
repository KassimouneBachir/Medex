"use client"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { DatabaseZapIcon, RotateCwIcon } from "lucide-react"

export default function DossiersError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Empty className="mt-10 rounded-xl border border-dashed bg-card py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <DatabaseZapIcon />
        </EmptyMedia>
        <EmptyTitle>Le service est momentanément indisponible</EmptyTitle>
        <EmptyDescription>
          Impossible de charger ces informations. Réessayez dans quelques instants.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCwIcon data-icon="inline-start" />
          Réessayer
        </Button>
      </EmptyContent>
    </Empty>
  )
}
