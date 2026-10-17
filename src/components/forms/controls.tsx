"use client"

import { useState, useTransition } from "react"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { ActionResult } from "@/app/actions"
import { CodeBlock } from "@/components/code-block"
import { notifyWrite } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type Choice = { value: string; label: string }

/** Lance une Server Action d'écriture : état d'attente, erreur affichée, toast de résultat. */
export function useWrite() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult>, title: (id: string) => string, onSuccess: (id: string) => void) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        setError(res.error)
        toast.error("Écriture refusée", { description: res.error })
        return
      }
      notifyWrite(res, title(res.id))
      onSuccess(res.id)
    })
  }

  return { error, pending, run }
}

export function ChoiceSelect({
  items,
  value,
  onChange,
  className,
  placeholder,
  id,
  "aria-label": ariaLabel,
}: {
  items: Choice[]
  value: string | null
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  id?: string
  "aria-label"?: string
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onChange(String(v))}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full data-[size=default]:h-9", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TextField({
  id,
  label,
  description,
  className,
  ...input
}: React.ComponentProps<"input"> & { id: string; label: string; description?: React.ReactNode }) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} className="h-9" {...input} />
      {description && <FieldDescription className="text-xs">{description}</FieldDescription>}
    </Field>
  )
}

export function FormSection({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-card ring-1 ring-foreground/10">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Liste de lignes éditables (allergies, symptômes, mesures…). */
export function Repeatable<T>({
  items,
  onAdd,
  onRemove,
  addLabel,
  empty,
  children,
  columns,
}: {
  items: T[]
  onAdd: () => void
  onRemove: (index: number) => void
  addLabel: string
  empty?: string
  children: (item: T, index: number) => React.ReactNode
  columns: string
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && empty && <p className="text-sm text-muted-foreground">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className={cn("grid items-center gap-2", columns)}>
          {children(item, i)}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Retirer la ligne"
            onClick={() => onRemove(i)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={onAdd}>
        <PlusIcon data-icon="inline-start" />
        {addLabel}
      </Button>
    </div>
  )
}

/** Carte collante : aperçu en direct de la commande mongosh + boutons d'action. */
export function QueryPreview({
  shell,
  error,
  pending,
  submitLabel,
  onCancel,
  note,
}: {
  shell: string
  error: string | null
  pending: boolean
  submitLabel: string
  onCancel: () => void
  note?: React.ReactNode
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-xl bg-card ring-1 ring-foreground/10">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Requête qui sera exécutée</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Mise à jour en direct à chaque saisie.</p>
        </header>
        <div className="space-y-3 p-4">
          <CodeBlock code={shell} maxHeight="max-h-[55vh]" dense />
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
      </section>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-9 flex-1" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" className="h-9 flex-1" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </div>
    </aside>
  )
}
