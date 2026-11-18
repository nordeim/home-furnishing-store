/**
 * PII masking for public surfaces. The order-confirmation page is reachable
 * by order number alone (no email check — that contract belongs to
 * /track-order), so it must never render the raw email or street address.
 */

/** "test@nordhem.sg" → "t***@nordhem.sg"; malformed input → "" (never echoes). */
export function maskEmail(email: string): string {
  const v = email.trim();
  const at = v.indexOf("@");
  if (at < 1 || at === v.length - 1 || /\s/.test(v)) return "";
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (!local || !domain.includes(".")) return "";
  return `${local[0]}***@${domain}`;
}
