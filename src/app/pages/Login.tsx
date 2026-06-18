import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../components/AuthContext";
import { Button } from "../ui/button";
import { Field, Panel } from "../components/shared/Primitives";
import { cn } from "../components/ui/utils";
import type { Role } from "../lib/types";

export function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("teacher");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!id.trim() || !password) {
      setError("Please enter both your ID and password.");
      return;
    }
    setLoading(true);
    try {
      await login(id.trim(), password);
    } catch {
      setError("The ID or password you entered is incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f7f3,#f4f5f0)] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <Panel className="animate-rise-in border-border bg-card/95 p-0 shadow-[0_24px_64px_-38px_rgba(42,41,37,0.28)]">
              <div className="border-b border-border px-7 py-6">
                <h2 className="text-2xl text-foreground">Sign in</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use your campus ID and password.</p>
              </div>

              <form onSubmit={submit} className="space-y-5 px-7 py-6">
                <div className="inline-flex w-full rounded-lg bg-surface-2 p-1">
                  {(["teacher", "admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 text-sm capitalize transition-all",
                        role === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <Field label={role === "admin" ? "Admin ID" : "Teacher ID"}>
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={role === "admin" ? "ADM-0001" : "FAC-1042"}
                    autoComplete="username"
                    className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
                  />
                </Field>

                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border border-border bg-card px-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
                  />
                </Field>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2.5 text-sm text-[#a85a4c] ring-1 ring-inset ring-error/20">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="h-11 w-full">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
