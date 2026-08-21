/**
 * Turns raw Supabase/Postgres errors into calm, human sentences.
 * Technical detail is logged for developers, never shown to the user.
 */
export function friendlyAuthError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const msg = raw.toLowerCase();

  if (import.meta.env.DEV) console.error("[auth]", raw);

  if (msg.includes("already registered") || msg.includes("duplicate key") || msg.includes("user already"))
    return "This email is already registered. Please sign in instead.";
  if (msg.includes("invalid login credentials"))
    return "That email and password don't match. Please try again.";
  if (msg.includes("email not confirmed"))
    return "Please confirm your email address before signing in.";
  if (msg.includes("weak") || msg.includes("pwned"))
    return "Please choose a stronger password — mix letters, numbers and a symbol.";
  if (msg.includes("password should be") || msg.includes("password must"))
    return "Your password must be at least 8 characters long.";
  if (msg.includes("invalid input syntax for type uuid"))
    return "Please select a valid district and city.";
  if (msg.includes("row-level security"))
    return "Your account could not be created. Please try again.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout"))
    return "We couldn't reach Manorcraft. Check your connection and try again.";
  if (msg.includes("banned") || msg.includes("disabled"))
    return "This account is currently disabled. Please contact Manorcraft support.";
  return fallback;
}
