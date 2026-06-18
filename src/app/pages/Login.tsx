import { useState } from "react";
import { AlertCircle, Loader2, GraduationCap } from "lucide-react";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(143,188,230,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(233,184,197,0.18),transparent_28%),linear-gradient(180deg,#f7fafc, #f5f9fc)] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:pr-8">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <GraduationCap className="size-4 text-[#4f7896]" />
            Academic attendance workspace
          </div>
          <h1 className="max-w-xl text-5xl leading-[1.05] tracking-tight text-foreground">
            Calm attendance tools for teachers and campus admins.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            The redesigned interface keeps the heavy lifting in the background and puts schedule,
            attendance, exports, and admin controls in a quiet, readable workspace.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-4">
            {[
              ["Live schedule", "Today’s classes at a glance"],
              ["Attendance review", "Sessions, overrides, exports"],
              ["Admin setup", "Subjects, teachers, timetable"],
            ].map(([title, desc]) => (
              <Panel key={title} className="bg-white/70">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </Panel>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <Panel className="animate-rise-in border-border bg-card/95 p-0 shadow-[0_30px_70px_-34px_rgba(42,41,37,0.34)]">
              <div className="border-b border-border px-7 py-6">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-[#4f7896]">
                  <span className="size-2 rounded-full bg-primary" />
                  BLE Attendance
                </div>
                <h2 className="mt-4 text-2xl tracking-tight text-foreground">Sign in</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use your campus ID and password.</p>
              </div>

              <form onSubmit={submit} className="space-y-5 px-7 py-6">
                <div className="inline-flex w-full rounded-2xl bg-surface-2 p-1">
                  {(["teacher", "admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 rounded-xl px-3 py-2 text-sm capitalize transition-all",
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
                    className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </Field>

                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </Field>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2.5 text-sm text-[#a85a4c] ring-1 ring-inset ring-error/20">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
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
