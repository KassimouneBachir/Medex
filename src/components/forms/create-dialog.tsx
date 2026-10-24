"use client"

import { Dialog } from "@base-ui/react/dialog"
import { PlusIcon, XIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { MedecinForm } from "./medecin-form"
import { TypeExamenForm } from "./type-examen-form"

type FormCallbacks = {
  onSuccess: () => void
  onCancel: () => void
  onPendingChange: (pending: boolean) => void
}

function CreateDialog({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: (callbacks: FormCallbacks) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const close = () => {
    setOpen(false)
    setPending(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen) }}>
      <Dialog.Trigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        {title}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background text-foreground shadow-xl ring-1 ring-foreground/10 outline-none">
          <div className="relative shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:pr-14">
            <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
            <Dialog.Close disabled={pending} render={<Button variant="ghost" size="icon-sm" />} className="absolute top-4 right-4" aria-label="Fermer">
              <XIcon />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
            {open && children({ onSuccess: close, onCancel: close, onPendingChange: setPending })}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function CreateMedecinButton({ specialites }: { specialites: string[] }) {
  return (
    <CreateDialog title="Ajouter un médecin" description="Créez la fiche du médecin et son accès personnel.">
      {(callbacks) => <MedecinForm specialites={specialites} {...callbacks} />}
    </CreateDialog>
  )
}

export function CreateTypeExamenButton() {
  return (
    <CreateDialog title="Ajouter un type d’examen" description="Définissez l’examen et les informations attendues dans ses résultats.">
      {(callbacks) => <TypeExamenForm {...callbacks} />}
    </CreateDialog>
  )
}
