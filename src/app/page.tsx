import { requireUser } from "@/lib/auth"
import { homeFor } from "@/lib/auth-core.mjs"
import { redirect } from "next/navigation"
import { Suspense } from "react"
export const instant = false
async function Home() { return redirect(homeFor(await requireUser())) }
export default function Page() { return <Suspense fallback={null}><Home /></Suspense> }
