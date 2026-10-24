import { LinkButton } from "@/components/link-button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FileQuestionIcon } from "lucide-react"

export default function DossierNotFound() {
  return (
    <Empty className="mt-10 rounded-xl border border-dashed bg-card py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestionIcon />
        </EmptyMedia>
        <EmptyTitle>Dossier introuvable</EmptyTitle>
        <EmptyDescription>
          Ce dossier est introuvable ou ne fait pas partie de vos patients.
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
