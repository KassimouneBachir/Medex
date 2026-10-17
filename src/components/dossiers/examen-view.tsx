import {
  ClipboardListIcon,
  FileImageIcon,
  FlaskConicalIcon,
  HeartPulseIcon,
  HourglassIcon,
  PencilIcon,
  ScanLineIcon,
  WindIcon,
} from "lucide-react"
import { LinkButton } from "@/components/link-button"
import { Mono, Pill } from "@/components/pill"
import { formatDate, humanizeKey, source, statutExamen } from "@/lib/format"
import type { Examen, Mesure, TypeExamen } from "@/lib/types"
import { cn } from "@/lib/utils"

const DOMAINES: Record<string, { icon: typeof FlaskConicalIcon; className: string }> = {
  biologie: { icon: FlaskConicalIcon, className: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300" },
  cardiologie: { icon: HeartPulseIcon, className: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" },
  imagerie: { icon: ScanLineIcon, className: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300" },
  pneumologie: { icon: WindIcon, className: "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300" },
}

export function DomaineIcon({ domaine, className }: { domaine?: string; className?: string }) {
  const d = (domaine && DOMAINES[domaine]) || { icon: ClipboardListIcon, className: "bg-muted text-muted-foreground" }
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", d.className, className)}>
      <d.icon className="size-3.5" />
    </span>
  )
}

function Mesures({ mesures }: { mesures: Mesure[] }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y">
        {mesures.map((m, i) => (
          <tr key={i}>
            <td className="py-1.5 text-muted-foreground">{m.parametre}</td>
            <td className="py-1.5 text-right font-medium tabular-nums">
              {m.valeur} <span className="font-normal text-muted-foreground">{m.unite}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KeyValues({ values }: { values: Record<string, string | number> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {Object.entries(values).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
          <dd className={cn("text-right", typeof v === "number" && "font-medium tabular-nums")}>{String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Resultat({ examen }: { examen: Examen }) {
  const { resultats, zone, images, rapport } = examen
  return (
    <>
      {Array.isArray(resultats) && resultats.length > 0 && <Mesures mesures={resultats} />}
      {resultats && !Array.isArray(resultats) && <KeyValues values={resultats} />}
      {zone && (
        <p className="text-sm">
          <span className="text-muted-foreground">Zone · </span>
          {zone}
        </p>
      )}
      {images && images.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {images.map((img) => (
            <li
              key={img}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground"
            >
              <FileImageIcon className="size-3.5 text-violet-600 dark:text-violet-300" />
              {img}
            </li>
          ))}
        </ul>
      )}
      {rapport && (rapport.observations || rapport.conclusion) && (
        <div className="space-y-1.5 rounded-md bg-muted/60 p-2.5 text-sm">
          {rapport.observations && (
            <p>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Observations</span>
              <br />
              {rapport.observations}
            </p>
          )}
          {rapport.conclusion && (
            <p>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conclusion</span>
              <br />
              <span className="font-medium">{rapport.conclusion}</span>
            </p>
          )}
        </div>
      )}
    </>
  )
}

export function ExamenView({ examen, type, saisieHref }: { examen: Examen; type?: TypeExamen; saisieHref: string }) {
  const statut = statutExamen(examen.statut)
  const realise = examen.statut === "realise"

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background/60">
      <div className="flex items-center gap-2.5 border-b px-3 py-2">
        <DomaineIcon domaine={type?.domaine} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">{type?.nom ?? `Type inconnu (${examen.typeExamenId})`}</p>
          <p className="truncate text-xs text-muted-foreground">
            {type ? [type.domaine, type.categorie].filter(Boolean).join(" · ") : "absent du catalogue"}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <Mono>{examen.examenId}</Mono>
          <Mono className="text-[10px]" title="Référence vers typesExamens">
            → {examen.typeExamenId}
          </Mono>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-3 py-2.5">
        {realise ? (
          <Resultat examen={examen} />
        ) : (
          <div className="flex flex-col items-start gap-2 py-1">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <HourglassIcon className="size-3.5" />
              En attente du résultat
            </p>
            <LinkButton href={saisieHref} size="sm">
              Saisir le résultat
            </LinkButton>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Pill tone={statut.tone}>{statut.label}</Pill>
        {realise && examen.dateResultat && (
          <span className="min-w-0 truncate" title={`Source : ${examen.source ?? "inconnue"}`}>
            {formatDate(examen.dateResultat)}
            {examen.source && ` · ${source(examen.source)}`}
          </span>
        )}
        {realise && (
          <LinkButton href={saisieHref} variant="ghost" size="xs" className="ml-auto shrink-0 text-muted-foreground">
            <PencilIcon data-icon="inline-start" />
            Modifier
          </LinkButton>
        )}
      </div>
    </div>
  )
}
