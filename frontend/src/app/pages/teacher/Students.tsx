import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { addStudent, getMyDivisions, listBatches, getDivisionStudents } from "../../../api/endpoints";
import { Button } from "../../ui/button";
import { PageHeader, Panel, EmptyState, Field } from "../../components/shared/Primitives";
import { StatusChip } from "../../components/shared/StatusChip";

export function Students() {
  const qc = useQueryClient();
  const { data: divisions = [] } = useQuery({ queryKey: ["my-divisions"], queryFn: getMyDivisions });
  const [divId, setDivId] = useState<number | "">("");
  const { data: batches = [] } = useQuery({ queryKey: ["batches", divId], queryFn: () => listBatches(divId as number), enabled: !!divId });
  const { data: students = [] } = useQuery({ queryKey: ["students", divId], queryFn: () => getDivisionStudents(divId as number), enabled: !!divId });
  const [form, setForm] = useState({ full_name: "", student_id: "", batch_id: "" });
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  const addMut = useMutation({
    mutationFn: () => addStudent({ full_name: form.full_name, student_id: form.student_id, division_id: divId as number, batch_id: form.batch_id ? Number(form.batch_id) : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", divId] });
      setForm({ full_name: "", student_id: "", batch_id: "" });
      setErr("");
      setShowForm(false);
    },
    onError: (e: any) => setErr(e.response?.data?.detail || "Error adding student"),
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Students"
        subtitle="Select a division, then add and review enrolled students."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={divId}
          onChange={(e) => {
            setDivId(Number(e.target.value));
            setShowForm(false);
          }}
          className="h-11 min-w-56 rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
        >
          <option value="">Select division</option>
          {(divisions as any[]).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>

        {divId && (
          <Button variant="outline" onClick={() => setShowForm((v) => !v)} className="rounded-xl">
            <UserPlus className="size-4" /> Add student
          </Button>
        )}
      </div>

      {showForm && divId && (
        <Panel className="mb-6">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto]">
            <Field label="Full name">
              <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
            </Field>
            <Field label="Student ID">
              <input value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
            </Field>
            <Field label="Batch">
              <select value={form.batch_id} onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
                <option value="">No batch</option>
                {(batches as any[]).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </Field>
            <div className="flex items-end">
              <Button onClick={() => addMut.mutate()} disabled={!form.full_name || !form.student_id} className="h-11 rounded-xl">
                Save
              </Button>
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-[#a85a4c]">{err}</p>}
        </Panel>
      )}

      {divId ? (
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Student ID</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(students as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10">
                      <EmptyState title="No students in this division" description="Add the first student to populate the roster." />
                    </td>
                  </tr>
                ) : (
                  (students as any[]).map((s) => (
                    <tr key={s.id} className="hover:bg-surface-2/40">
                      <td className="px-5 py-4 font-mono text-muted-foreground">{s.student_id}</td>
                      <td className="px-5 py-4">{s.full_name}</td>
                      <td className="px-5 py-4">
                        {s.batch_id ? <StatusChip tone="info">{(batches as any[]).find((b) => b.id === s.batch_id)?.label ?? "Batch"}</StatusChip> : <span className="text-muted-foreground">No batch</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <EmptyState title="Choose a division" description="Student management starts with selecting a division." />
      )}
    </div>
  );
}
