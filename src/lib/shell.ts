// Sérialise des valeurs JS en syntaxe mongosh, pour afficher les requêtes
// exactement comme on les taperait dans le shell. Utilisable côté client et serveur.

const MAX_WIDTH = 60
const IDENT = /^[A-Za-z_$][\w$]*$/

type ObjectIdLike = { _bsontype: "ObjectId"; toHexString(): string }

function isObjectId(v: unknown): v is ObjectIdLike {
  return typeof v === "object" && v !== null && (v as ObjectIdLike)._bsontype === "ObjectId"
}

function isContainer(v: unknown): v is object {
  return (
    typeof v === "object" &&
    v !== null &&
    !(v instanceof Date) &&
    !(v instanceof RegExp) &&
    !isObjectId(v)
  )
}

function quote(s: string) {
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
}

function key(k: string) {
  return IDENT.test(k) ? k : quote(k)
}

function entriesOf(v: object) {
  return Object.entries(v).filter(([, x]) => x !== undefined)
}

function inline(v: unknown): string {
  if (v === null) return "null"
  if (v === undefined) return "undefined"
  if (typeof v === "string") return quote(v)
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v instanceof RegExp) return v.toString()
  if (v instanceof Date) return `ISODate('${v.toISOString()}')`
  if (isObjectId(v)) return `ObjectId('${v.toHexString()}')`
  if (Array.isArray(v)) return v.length ? `[ ${v.map(inline).join(", ")} ]` : "[]"
  const entries = entriesOf(v as object)
  if (!entries.length) return "{}"
  return `{ ${entries.map(([k, x]) => `${key(k)}: ${inline(x)}`).join(", ")} }`
}

function format(v: unknown, indent: number, column: number): string {
  const flat = inline(v)
  if (column + flat.length <= MAX_WIDTH || !isContainer(v)) return flat

  const inner = indent + 2
  const pad = " ".repeat(inner)
  const close = " ".repeat(indent)

  if (Array.isArray(v)) {
    if (!v.length) return "[]"
    return `[\n${v.map((x) => pad + format(x, inner, inner)).join(",\n")}\n${close}]`
  }

  const lines = entriesOf(v).map(([k, x]) => {
    const prefix = `${key(k)}: `
    return pad + prefix + format(x, inner, inner + prefix.length)
  })
  return `{\n${lines.join(",\n")}\n${close}}`
}

/** Valeur seule, indentée si elle dépasse la largeur. */
export function toShell(value: unknown): string {
  return format(value, 0, 0)
}

/** `db.<collection>.<method>(args…)` */
export function shellCall(collection: string, method: string, ...args: unknown[]): string {
  const head = `db.${collection}.${method}(`
  const flat = head + args.map(inline).join(", ") + ")"
  if (flat.length <= MAX_WIDTH) return flat
  let out = head
  args.forEach((arg, i) => {
    if (i > 0) out += ", "
    // Colonne courante = longueur de la dernière ligne déjà écrite.
    out += format(arg, 0, out.length - out.lastIndexOf("\n") - 1)
  })
  return out + ")"
}

export type TokenKind = "str" | "key" | "op" | "num" | "fn" | "kw" | "rx" | "plain"

const TOKEN =
  /('(?:\\.|[^'\\])*')|(\/(?:\\.|[^/\\\n])+\/[gimsuy]*)|(\$[A-Za-z][\w.]*)|\b(ObjectId|ISODate)\b|\b(true|false|null|undefined|db)\b|((?<=\.)[A-Za-z]+(?=\())|(\b[A-Za-z_][\w]*(?=\s*:))|(-?\b\d+(?:\.\d+)?\b)/g

/** Découpe une chaîne mongosh en jetons colorables. */
export function tokenize(code: string): { text: string; kind: TokenKind }[] {
  const out: { text: string; kind: TokenKind }[] = []
  let last = 0
  for (const m of code.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: code.slice(last, i), kind: "plain" })
    const [text, str, rx, op, fn, kw, method, k] = m
    let kind: TokenKind = "num"
    if (str) kind = /^\s*:/.test(code.slice(i + text.length)) ? "key" : "str"
    else if (rx) kind = "rx"
    else if (op) kind = "op"
    else if (fn || method) kind = "fn"
    else if (kw) kind = "kw"
    else if (k) kind = "key"
    out.push({ text, kind })
    last = i + text.length
  }
  if (last < code.length) out.push({ text: code.slice(last), kind: "plain" })
  return out
}
