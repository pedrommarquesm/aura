import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-aura-glow-sm">
        <p className="text-caption uppercase tracking-[0.2em] text-text-muted">Aura</p>
        <h1 className="mt-2 text-title text-aura-gradient">Admin</h1>
        <p className="mt-3 text-body text-text-secondary">
          Staff only. Sign in with the Google account you were invited with.
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-caption text-danger">
            {errorMessage(error)}
          </p>
        ) : null}
        <div className="mt-8">
          <LoginButton />
        </div>
        <p className="mt-6 text-caption text-text-muted">
          Consumer accounts on auraclimb.com cannot sign in here. Staff lives in
          a separate table.
        </p>
      </div>
    </div>
  );
}

function errorMessage(error: string): string {
  if (error === "not_staff" || error === "AccessDenied") {
    return "That Google account is not on the staff list.";
  }
  if (error === "staff_deactivated") {
    return "This staff account has been deactivated.";
  }
  if (error === "Session" || error === "RefreshError") {
    return "Your session expired. Sign in again.";
  }
  return "Sign-in failed. Try again, or ask the owner to invite this email.";
}
