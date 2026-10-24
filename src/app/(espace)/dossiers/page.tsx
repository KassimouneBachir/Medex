import { DossierFilters } from "@/components/dossiers/dossier-filters"
import { DossiersTable } from "@/components/dossiers/dossiers-table"
import { LinkButton } from "@/components/link-button"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import { cache, Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { filterOptions, listDossiers, parseFilters } from "@/lib/data"

export const instant = false

export const metadata: Metadata = { title: "Dossiers" }

type SP = PageProps<"/dossiers">["searchParams"]

// Les deux zones de la page appellent loadList avec la même promesse :
// React.cache déduplique, MongoDB n'est interrogé qu'une fois par requête.
const loadList = cache(async (searchParams: SP) => {
  const filters = parseFilters(await searchParams)
  const [list, options] = await Promise.all([listDossiers(filters), filterOptions()])
  return { filters, rows: list.rows, options, entries: [...list.entries, ...options.entries] }
})

async function DossiersList({ searchParams }: { searchParams: SP }) {
  const { filters, rows, options } = await loadList(searchParams)
  return (
    <>
      <DossierFilters filters={filters} specialites={options.specialites} groupes={options.groupes} />
      <DossiersTable rows={rows} />
      <footer className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {rows.length} dossier{rows.length > 1 ? "s" : ""}
        </span>

      </footer>
    </>
  )
}

function ListSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row">
        <Skeleton className="h-9 flex-1" />
        <div className="flex gap-2">
          {[32, 36, 44, 40].map((w) => (
            <Skeleton key={w} className="h-9" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="hidden h-5 w-10 sm:block" />
            <Skeleton className="hidden h-5 w-24 md:block" />
          </div>
        ))}
      </div>
    </>
  )
}

export default function DossiersPage({ searchParams }: PageProps<"/dossiers">) {
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: "Medex", href: "/dossiers" }, { label: "Dossiers" }]} />}
        title="Dossiers médicaux"
        description="Retrouvez vos patients, leurs consultations et leurs examens."
        actions={
          <>

            <LinkButton href="/dossiers/nouveau">
              <PlusIcon data-icon="inline-start" />
              Nouveau dossier
            </LinkButton>
          </>
        }
      />
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Suspense fallback={<ListSkeleton />}>
          <DossiersList searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  )
}
