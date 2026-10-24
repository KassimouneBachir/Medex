"use client"

import { deleteConsultation, deleteDossier } from "@/app/actions"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogMedia,
AlertDialogTitle,
AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { notifyWrite } from "@/lib/notify"

function ConfirmDelete({
  trigger,
  title,
  description,
  onConfirm,
}: {
  trigger: React.ReactElement
  title: string
  description: React.ReactNode
  onConfirm: () => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger}>
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md" initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (await onConfirm()) setOpen(false)
              })
            }
          >
            {pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function DeleteDossierButton({ dossierId, patientName }: { dossierId: string; patientName: string }) {
  const router = useRouter()
  return (
    <ConfirmDelete
      trigger={<Button variant="destructive" size="icon" aria-label="Supprimer le dossier" title="Supprimer le dossier" />}
      title={`Supprimer le dossier ${dossierId} ?`}
      description={<>Le dossier de {patientName} et toutes ses consultations seront définitivement supprimés.</>}
      onConfirm={async () => {
        const ok = notifyWrite(await deleteDossier(dossierId), `Dossier ${dossierId} supprimé`)
        if (ok) router.push("/dossiers")
        return ok
      }}
    />
  )
}

export function DeleteConsultationButton({ dossierId, consultationId }: { dossierId: string; consultationId: string }) {
  return (
    <ConfirmDelete
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Supprimer la consultation ${consultationId}`}
          title="Supprimer la consultation"
        />
      }
      title={`Supprimer la consultation ${consultationId} ?`}
      description="La consultation et ses examens seront retirés du dossier."
      onConfirm={async () =>
        notifyWrite(await deleteConsultation(dossierId, consultationId), `Consultation ${consultationId} supprimée`)
      }
    />
  )
}
