"use client"

import { DatabaseZapIcon, RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function DossiersError({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Empty className="mt-10 rounded-xl border border-dashed bg-card py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <DatabaseZapIcon />
        </EmptyMedia>
        <EmptyTitle>MongoDB est injoignable</EmptyTitle>
        <EmptyDescription>
          Vérifiez que le service tourne et que <code className="font-mono">MONGODB_URI</code> est correct dans{" "}
          <code className="font-mono">.env.local</code>.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="max-w-md truncate font-mono text-xs text-muted-foreground" title={message}>
          {message}
        </p>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCwIcon data-icon="inline-start" />
          Réessayer
        </Button>
      </EmptyContent>
    </Empty>
  )
}
