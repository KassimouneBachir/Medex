import Link from "next/link"
import { CalendarClockIcon, ChevronRightIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"
import { PatientAvatar } from "@/components/patient-avatar"
import { BloodType, Mono, Pill } from "@/components/pill"
import { RowLink } from "@/components/dossiers/row-link"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, fullName, severite } from "@/lib/format"
import type { DossierRow } from "@/lib/types"

export function DossiersTable({ rows }: { rows: DossierRow[] }) {
  if (!rows.length) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun dossier ne correspond</EmptyTitle>
          <EmptyDescription>
            Modifiez la recherche ou les filtres, ou <Link href="/dossiers">réinitialisez la vue</Link>.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/40 [&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Patient</TableHead>
          <TableHead className="hidden sm:table-cell">Sexe · Âge</TableHead>
          <TableHead>Groupe</TableHead>
          <TableHead className="hidden lg:table-cell">Allergies</TableHead>
          <TableHead className="hidden md:table-cell">Consultations</TableHead>
          <TableHead className="hidden md:table-cell">Dernière visite</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const href = `/dossiers/${r.dossierId}`
          return (
            <RowLink key={r.dossierId} href={href}>
              <TableCell className="py-2.5 pl-4">
                <div className="flex items-center gap-3">
                  <PatientAvatar patient={r.patient} />
                  <div className="min-w-0">
                    <Link href={href} className="block truncate font-medium hover:underline">
                      {fullName(r.patient)}
                    </Link>
                    <Mono>{r.dossierId}</Mono>
                    <span className="text-xs text-muted-foreground"> · né(e) le {formatDate(r.patient.dateNaissance)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {r.patient.sexe} · {r.patient.age !== undefined ? `${r.patient.age} ans` : "—"}
              </TableCell>
              <TableCell>
                <BloodType value={r.patient.groupeSanguin} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {r.patient.allergies.length ? (
                  <div className="flex flex-wrap gap-1">
                    {r.patient.allergies.map((a) => (
                      <Pill key={a.substance} tone={severite(a.severite).tone} title={`Sévérité ${severite(a.severite).label.toLowerCase()}`}>
                        {a.severite === "elevee" && <TriangleAlertIcon />}
                        {a.substance}
                      </Pill>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Aucune</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-right font-medium tabular-nums">{r.nbConsultations}</span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="max-w-56 truncate text-xs text-muted-foreground">{r.specialites.join(", ") || "—"}</p>
                    {r.prochaineConsultation && (
                      <Pill tone="amber" title={`${r.nbPlanifiees} consultation(s) planifiée(s)`}>
                        <CalendarClockIcon />
                        RDV {formatDate(r.prochaineConsultation)}
                      </Pill>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                {formatDate(r.derniereConsultation)}
              </TableCell>
              <TableCell className="pr-3">
                <ChevronRightIcon className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </TableCell>
            </RowLink>
          )
        })}
      </TableBody>
    </Table>
  )
}
