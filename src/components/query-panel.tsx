"use client"

import { BracesIcon, DatabaseIcon, PencilLineIcon, SearchIcon } from "lucide-react"
import { CodeBlock } from "@/components/code-block"
import { Pill } from "@/components/pill"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatMs } from "@/lib/format"
import type { QueryEntry } from "@/lib/types"

function timeOf(iso?: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function QueryEntryCard({ entry }: { entry: QueryEntry }) {
  const isWrite = entry.kind === "write"
  return (
    <article className="space-y-2">
      <header className="flex flex-wrap items-center gap-2">
        <Pill tone={isWrite ? "amber" : "teal"}>
          {isWrite ? <PencilLineIcon /> : <SearchIcon />}
          {isWrite ? "Écriture" : "Lecture"}
        </Pill>
        <h3 className="text-sm font-medium">{entry.label}</h3>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {entry.summary && <span>{entry.summary}</span>}
          {entry.durationMs !== undefined && <span>· {formatMs(entry.durationMs)}</span>}
          {entry.at && <span>· {timeOf(entry.at)}</span>}
        </span>
      </header>
      <CodeBlock code={entry.shell} />
      {entry.result && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Réponse du serveur</p>
          <CodeBlock code={entry.result} maxHeight="max-h-40" />
        </div>
      )}
    </article>
  )
}

export function QueryPanel({
  entries,
  lastWrite,
  raw,
}: {
  entries: QueryEntry[]
  lastWrite?: QueryEntry | null
  raw?: string
}) {
  const reads = (
    <div className="space-y-6">
      {entries.map((e, i) => (
        <QueryEntryCard key={i} entry={e} />
      ))}
      {lastWrite && (
        <section className="space-y-3 border-t pt-5">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Dernière écriture</h2>
          <QueryEntryCard entry={lastWrite} />
        </section>
      )}
    </div>
  )

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <BracesIcon data-icon="inline-start" />
        Requête MongoDB
        <span className="ml-0.5 rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground tabular-nums">
          {entries.length}
        </span>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-primary" />
            Requêtes MongoDB
          </SheetTitle>
          <SheetDescription>
            Opérations exécutées par le serveur Next.js via le driver natif <code className="font-mono">mongodb</code>{" "}
            pour afficher cette page.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          {raw ? (
            <Tabs defaultValue="queries">
              <TabsList className="mb-4">
                <TabsTrigger value="queries">Requêtes</TabsTrigger>
                <TabsTrigger value="raw">Document brut</TabsTrigger>
              </TabsList>
              <TabsContent value="queries">{reads}</TabsContent>
              <TabsContent value="raw">
                <CodeBlock code={raw} maxHeight="max-h-[70vh]" />
              </TabsContent>
            </Tabs>
          ) : (
            reads
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function QueryPanelSkeleton() {
  return (
    <Button variant="outline" disabled>
      <BracesIcon data-icon="inline-start" />
      Requête MongoDB
    </Button>
  )
}
