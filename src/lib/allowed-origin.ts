/**
 * Whether a request's Origin is one of WIZARD_ALLOWED_ORIGINS (comma-separated): the site's own POSTs (the wizard
 * chat, the scoreboard's runs and saves) answer only the site. A same-origin GET carries no Origin, so GETs don't check.
 */
export function allowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const allowed = (process.env.WIZARD_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  return allowed.includes(origin)
}
