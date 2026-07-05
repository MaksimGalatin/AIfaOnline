// Vertex AI access token.
// - prod (Cloud Run): Application Default Credentials via the attached SA (no key file).
// - dev: set GOOGLE_OAUTH_TOKEN (e.g. `gcloud auth print-access-token`).
export async function getAccessToken(): Promise<string> {
  const dev = process.env.GOOGLE_OAUTH_TOKEN;
  if (dev) return dev.trim();
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  if (!tok.token) throw new Error("no access token from ADC");
  return tok.token;
}
