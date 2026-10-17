import { FileQuestionIcon } from "lucide-react"
import { LinkButton } from "@/components/link-button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function DossierNotFound() {
  return (
    <Empty className="mt-10 rounded-xl border border-dashed bg-card py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestionIcon />
        </EmptyMedia>
        <EmptyTitle>Dossier introuvable</EmptyTitle>
        <EmptyDescription>
          Aucun document ne correspond à ce <code className="font-mono">dossierId</code> dans la collection.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <LinkButton href="/dossiers" variant="outline">
          Retour aux dossiers
        </LinkButton>
      </EmptyContent>
    </Empty>
  )
}
