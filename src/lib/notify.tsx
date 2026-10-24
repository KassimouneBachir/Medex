import type { ActionResult } from "@/app/actions"
import { toast } from "sonner"

/** Toast de résultat d'une écriture MongoDB, avec le résumé renvoyé par le serveur. */
export function notifyWrite(res: ActionResult, title: string) {
  if (!res.ok) {
    toast.error("Modification refusée", { description: res.error })
    return false
  }
  toast.success(title)
  return true
}
