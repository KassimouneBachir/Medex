import { requireRole } from "@/lib/auth"
import { Suspense } from "react"
async function DoctorArea({ children }: { children: React.ReactNode }) {
  await requireRole("medecin")
  return children
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><DoctorArea>{children}</DoctorArea></Suspense>
}
