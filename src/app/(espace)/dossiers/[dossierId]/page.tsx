import { ConsultationCard } from "@/components/dossiers/consultation-card"
import { DeleteDossierButton } from "@/components/dossiers/delete-buttons"
import { LinkButton } from "@/components/link-button"
import { Breadcrumbs, PageHeader } from "@/components/page-header"
import { PatientAvatar } from "@/components/patient-avatar"
import { BloodType, Mono, Pill } from "@/components/pill"
import { requireRole } from "@/lib/auth"
import { CalendarPlusIcon, ClipboardListIcon, PencilIcon, ShieldAlertIcon, TriangleAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache, Suspense } from "react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { getDossier, type DossierVue } from "@/lib/data"
import { formatDate, fullName, severite, sexe, typeAntecedent } from "@/lib/format"

export const instant = false

export const metadata: Metadata = { title: "Dossier patient" }

type Params = PageProps<"/dossiers/[dossierId]">["params"]

const load = cache(async (params: Params) => {
  const { dossierId } = await params
  const res = await getDossier(decodeURIComponent(dossierId))
  if (!res.vue) notFound()
  return { ...res, vue: res.vue }
})

function InfoCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function PatientSidebar({ vue }: { vue: DossierVue }) {
  const d = vue.dossier
  const p = d.patient
  const examens = d.consultations.flatMap((c) => c.examens)
  const enAttente = examens.filter((e) => e.statut === "planifie").length
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <InfoCard title="Identité">
        <dl className="divide-y">
          <Field label="Nom">{p.nom}</Field>
          <Field label="Prénom">{p.prenom}</Field>
          <Field label="Naissance">{formatDate(p.dateNaissance)}</Field>
          <Field label="Âge">
            {p.age !== undefined ? (
              <span className="tabular-nums">{p.age} ans</span>
            ) : (
              <span className="text-muted-foreground" title="Âge non renseigné">
                Non renseigné
              </span>
            )}
          </Field>
          <Field label="Sexe">{sexe(p.sexe).label}</Field>
          <Field label="Groupe sanguin">
            <BloodType value={p.groupeSanguin} />
          </Field>
        </dl>
      </InfoCard>

      <InfoCard title="Antécédents">
        {p.antecedents?.length ? (
          <ul className="space-y-2.5">
            {p.antecedents.map((a, i) => {
              const type = typeAntecedent(a.type)
              return (
                <li key={i} className="space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone={type.tone}>{type.label}</Pill>
                    {a.annee && <span className="text-xs text-muted-foreground tabular-nums">{a.annee}</span>}
                  </div>
                  <p>{a.description}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun antécédent renseigné.</p>
        )}
      </InfoCard>

      <InfoCard
        title="Allergies"
        action={p.allergies.length > 0 && <ShieldAlertIcon className="size-4 text-rose-600 dark:text-rose-300" />}
      >
        {p.allergies.length ? (
          <ul className="space-y-2">
            {p.allergies.map((a) => {
              const s = severite(a.severite)
              return (
                <li key={a.substance} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{a.substance}</span>
                  <Pill tone={s.tone}>
                    {a.severite === "elevee" && <TriangleAlertIcon />}
                    {s.label}
                  </Pill>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune allergie connue.</p>
        )}
      </InfoCard>

      <InfoCard title="Suivi du patient">
        <dl className="divide-y">
          <Field label="Consultations">
            <span className="tabular-nums">{d.consultations.length}</span>
          </Field>
          <Field label="Examens">
            <span className="tabular-nums">
              {examens.length}
              {enAttente > 0 && <span className="text-muted-foreground"> · {enAttente} en attente</span>}
            </span>
          </Field>
          <Field label="Équipe et examens">
            <span className="text-xs text-muted-foreground tabular-nums">
              {Object.keys(vue.medecins).length} médecin(s) · {Object.keys(vue.types).length} type(s)
            </span>
          </Field>
        </dl>
      </InfoCard>
    </aside>
  )
}

async function DossierView({ params }: { params: Params }) {
  const user = await requireRole("medecin")
  const { vue } = await load(params)
  const d = vue.dossier
  const p = d.patient
  // Planifiées d'abord (à venir), puis réalisées, les plus récentes en tête.
  const consultations = [...d.consultations].sort(
    (a, b) => Number(a.statut === "realisee") - Number(b.statut === "realisee") || b.date.localeCompare(a.date),
  )
  const base = `/dossiers/${d.dossierId}`

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Medex", href: "/dossiers" }, { label: "Dossiers", href: "/dossiers" }, { label: d.dossierId }]}
          />
        }
        leading={<PatientAvatar patient={p} size="lg" />}
        title={fullName(p)}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Mono className="text-foreground/80">{d.dossierId}</Mono>
            <span aria-hidden>·</span>
            <span>{sexe(p.sexe).label}</span>
            <span aria-hidden>·</span>
            <span>{p.age !== undefined ? `${p.age} ans` : "âge non renseigné"}</span>
            <span aria-hidden>·</span>
            <BloodType value={p.groupeSanguin} />
            {p.allergies.some((a) => a.severite === "elevee") && (
              <Pill tone="rose">
                <TriangleAlertIcon />
                Allergie sévère
              </Pill>
            )}
          </span>
        }
        actions={
          <>

            <LinkButton href={`${base}/modifier`} variant="outline">
              <PencilIcon data-icon="inline-start" />
              Modifier
            </LinkButton>
            <LinkButton href={`${base}/consultations/nouvelle`}>
              <CalendarPlusIcon data-icon="inline-start" />
              Planifier une consultation
            </LinkButton>
            {d.consultations.every((c) => c.medecinId === user.medecinId) && <DeleteDossierButton dossierId={d.dossierId} patientName={fullName(p)} />}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <PatientSidebar vue={vue} />

        <section className="min-w-0 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Consultations <span className="font-normal text-muted-foreground tabular-nums">({consultations.length})</span>
            </h2>
            {consultations.length > 1 && (
              <span className="text-xs text-muted-foreground">Planifiées d&apos;abord, puis les plus récentes</span>
            )}
          </div>

          {consultations.length ? (
            <ol className="relative space-y-4 before:absolute before:top-4 before:bottom-4 before:left-[11px] before:hidden before:w-px before:bg-border sm:pl-8 sm:before:block">
              {consultations.map((c) => (
                <li key={c.consultationId} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-3.5 -left-8 hidden size-[23px] items-center justify-center rounded-full bg-background ring-1 ring-border sm:flex"
                  >
                    <span className={c.statut === "planifiee" ? "size-2 rounded-full bg-amber-500" : "size-2 rounded-full bg-primary"} />
                  </span>
                  <ConsultationCard
                    canEdit={c.medecinId === user.medecinId}
                    dossierId={d.dossierId}
                    consultation={c}
                    medecin={vue.medecins[c.medecinId]}
                    types={vue.types}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <Empty className="rounded-xl border border-dashed bg-card py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardListIcon />
                </EmptyMedia>
                <EmptyTitle>Aucune consultation</EmptyTitle>
                <EmptyDescription>Ce dossier ne contient encore aucune consultation.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <LinkButton href={`${base}/consultations/nouvelle`}>
                  <CalendarPlusIcon data-icon="inline-start" />
                  Planifier une consultation
                </LinkButton>
              </EmptyContent>
            </Empty>
          )}
        </section>
      </div>
    </>
  )
}

function DossierSkeleton() {
  return (
    <>
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </>
  )
}

export default function DossierPage({ params }: PageProps<"/dossiers/[dossierId]">) {
  return (
    <Suspense fallback={<DossierSkeleton />}>
      <DossierView params={params} />
    </Suspense>
  )
}
