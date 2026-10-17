import { Skeleton } from "@/components/ui/skeleton"

export function FormSkeleton() {
  return (
    <>
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </>
  )
}
