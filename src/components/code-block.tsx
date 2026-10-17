"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { tokenize, type TokenKind } from "@/lib/shell"
import { cn } from "@/lib/utils"

const COLORS: Record<TokenKind, string> = {
  plain: "",
  str: "text-emerald-700 dark:text-emerald-300",
  key: "text-sky-700 dark:text-sky-300",
  op: "text-rose-600 font-medium dark:text-rose-300",
  num: "text-amber-700 dark:text-amber-300",
  fn: "text-violet-700 dark:text-violet-300",
  kw: "text-teal-700 font-medium dark:text-teal-300",
  rx: "text-orange-700 dark:text-orange-300",
}

export function CodeBlock({
  code,
  className,
  maxHeight = "max-h-[28rem]",
  dense = false,
}: {
  code: string
  className?: string
  maxHeight?: string
  dense?: boolean
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className={cn("group/code relative rounded-lg border bg-code text-code-foreground", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Copier la requête"
        className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        onClick={async () => {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
      <pre
        className={cn(
          "overflow-auto p-3 pr-9 font-mono leading-relaxed",
          dense ? "text-[11.5px]" : "text-[12.5px]",
          maxHeight,
        )}
      >
        <code>
          {tokenize(code).map((t, i) =>
            t.kind === "plain" ? (
              t.text
            ) : (
              <span key={i} className={COLORS[t.kind]}>
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  )
}
