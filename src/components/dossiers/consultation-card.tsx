import { ClipboardCheckIcon, StethoscopeIcon } from "lucide-react"
import { DeleteConsultationButton } from "@/components/dossiers/delete-buttons"
import { ExamenView } from "@/components/dossiers/examen-view"
import { LinkButton } from "@/components/link-button"
import { Mono, Pill } from "@/components/pill"
import { formatDate, intensite, nomMedecin, statutConsultation, statutDiagnostic, typeConsultation } from "@/lib/format"
import type { Consultation, Medecin, TypeExamen } from "@/lib/types"

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
        {count !== undefined && <span className="font-mono font-normal tabular-nums">({count})</span>}
      </h4>
      {children}
    </section>
  )
}

function None({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground/80">{children}</p>
}

export function ConsultationCard({
  dossierId,
  consultation: c,
  medecin,
  types,
}: {
  dossierId: string
  consultation: Consultation
  medecin?: Medecin
  types: Record<string, TypeExamen>
}) {
  const type = typeConsultation(c.type)
  const statut = statutConsultation(c.statut)
  const planifiee = c.statut === "planifiee"
  const base = `/dossiers/${dossierId}/consultations/${c.consultationId}`

  return (
    <article className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/30 py-2.5 pr-2 pl-4">
        <time dateTime={c.date} className="text-sm font-semibold tabular-nums">
          {formatDate(c.date)}
        </time>
        <Pill tone={type.tone}>{type.label}</Pill>
        <Pill tone={statut.tone}>{statut.label}</Pill>
        <Mono>{c.consultationId}</Mono>
        <div className="ml-auto">
          <DeleteConsultationButton dossierId={dossierId} consultationId={c.consultationId} />
        </div>
      </header>

      <div className="space-y-5 p-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight">{c.motif}</h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <StethoscopeIcon className="size-4 text-primary" />
            <span className="text-foreground">{nomMedecin(medecin, c.medecinId)}</span>
            {medecin && (
              <>
                <span aria-hidden>·</span>
                <span>{medecin.specialite}</span>
              </>
            )}
            <Mono className="text-[10px]" title="Référence vers la collection medecins">
              → {c.medecinId}
            </Mono>
          </p>
        </div>

        {planifiee ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-50/60 p-3 sm:flex-row sm:items-center dark:bg-amber-400/5">
            <p className="flex-1 text-sm">
              <span className="font-medium">Rendez-vous planifié.</span>{" "}
              <span className="text-muted-foreground">Le médecin renseignera les symptômes et le diagnostic.</span>
            </p>
            <LinkButton href={`${base}/completer`} size="sm">
              <ClipboardCheckIcon data-icon="inline-start" />
              Compléter la consultation
            </LinkButton>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Section title="Symptômes" count={c.symptomes.length}>
              {c.symptomes.length ? (
                <ul className="space-y-1.5">
                  {c.symptomes.map((s, i) => {
                    const level = intensite(s.intensite)
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{s.nom}</span>
                        <span className="text-xs text-muted-foreground">{s.duree}</span>
                        <Pill tone={level.tone}>{level.label}</Pill>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <None>Aucun symptôme renseigné.</None>
              )}
            </Section>
            <Section title="Diagnostics" count={c.diagnostics.length}>
              {c.diagnostics.length ? (
                <ul className="space-y-1.5">
                  {c.diagnostics.map((d, i) => {
                    const s = statutDiagnostic(d.statut)
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1">{d.nom}</span>
                        <Pill tone={s.tone}>{s.label}</Pill>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <None>Aucun diagnostic posé.</None>
              )}
            </Section>
          </div>
        )}

        <Section title="Examens" count={c.examens.length}>
          {c.examens.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {c.examens.map((e) => (
                <ExamenView
                  key={e.examenId}
                  examen={e}
                  type={types[e.typeExamenId]}
                  saisieHref={`${base}/examens/${e.examenId}/resultat`}
                />
              ))}
            </div>
          ) : (
            <None>Aucun examen prévu.</None>
          )}
        </Section>
      </div>
    </article>
  )
}
