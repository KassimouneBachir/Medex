import { PasswordForm } from "@/components/auth/password-form"
import { PageHeader } from "@/components/page-header"
import { requireUser } from "@/lib/auth"
import { Suspense } from "react"
export const instant = false

export const metadata = { title: "Mon compte" }
async function Account() { const user = await requireUser(); return <><PageHeader title="Mon compte" description={`${user.name} · ${user.email}`} /><PasswordForm /></> }
export default function Page() { return <Suspense fallback={null}><Account /></Suspense> }
