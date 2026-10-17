import { toast } from "sonner"
import type { ActionResult } from "@/app/actions"

/** Toast de résultat d'une écriture MongoDB, avec le résumé renvoyé par le serveur. */
export function notifyWrite(res: ActionResult, title: string) {
  if (!res.ok) {
    toast.error("Écriture refusée", { description: res.error })
    return false
  }
  toast.success(title, {
    description: <span className="font-mono text-xs">{res.entry.summary}</span>,
  })
  return true
}
