import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Fingerprint, Lock, ListChecks, MapPin, Search } from "lucide-react";
import {
  getMyAssignments,
  getMySessions,
  getAttendanceSummary,
  overrideAttendance,
  lockAttendance,
} from "../../../api/endpoints";
import { Button } from "../../ui/button";
import { PageHeader, Panel, EmptyState } from "../../components/shared/Primitives";
import { StatusChip } from "../../components/shared/StatusChip";
import type { AttendanceSummary, TeacherAssignment, TeacherSession } from "../../lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function Sessions() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: getMyAssignments,
    refetchInterval: 60_000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions", selectedAssignment],
    queryFn: () => getMySessions(selectedAssignment ? { assignment_id: selectedAssignment } : undefined),
    refetchInterval: 30_000,
  });

  const filteredAssignments = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (assignments as TeacherAssignment[]).filter((a) =>
      `${a.subject_code} ${a.subject_name} ${a.division_label} ${a.batch_label ?? ""}`.toLowerCase().includes(text)
    );
  }, [assignments, query]);

  const selectedAssignmentData = (assignments as TeacherAssignment[]).find((a) => a.id === selectedAssignment) ?? null;
  const selectedSessionData = (sessions as TeacherSession[]).find((s) => s.id === selectedSession) ?? null;

  const { data: summary } = useQuery({
    queryKey: ["attendance-summary", selectedSession],
    queryFn: () => getAttendanceSummary(selectedSession!),
    enabled: !!selectedSession,
    refetchInterval: 15_000,
  });

  const summaryData = summary as AttendanceSummary | undefined;
  const editable = selectedSessionData ? selectedSessionData.is_active || selectedSessionData.finalization_open : false;

  const overrideMut = useMutation({
    mutationFn: ({ studentId, isPresent }: { studentId: string; isPresent: boolean }) =>
      overrideAttendance(selectedSession!, {
        student_user_id: studentId,
        is_present: isPresent,
        reason: overrideReason || "Manual override",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-summary", selectedSession] }),
  });

  const lockMut = useMutation({
    mutationFn: () => lockAttendance(selectedSession!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-sessions", selectedAssignment] });
      qc.invalidateQueries({ queryKey: ["attendance-summary", selectedSession] });
    },
  });

  if (selectedSession && summaryData) {
    return (
      <>
        <PageHeader
          back={
            <button onClick={() => setSelectedSession(null)} className="mb-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to sessions
            </button>
          }
          title={`${summaryData.subject}`}
          subtitle={`${fmtDate(summaryData.starts_at)} · ${summaryData.records.length} students`}
          actions={
            <div className="flex items-center gap-2">
              {selectedSessionData?.attendance_locked ? <StatusChip tone="locked">Locked</StatusChip> : editable ? <StatusChip tone="editable">Editable</StatusChip> : <StatusChip tone="ended">Closed</StatusChip>}
              {!selectedSessionData?.attendance_locked && selectedSessionData?.is_active && (
                <Button variant="outline" className="rounded-xl" onClick={() => lockMut.mutate()}>
                  <Lock className="size-4" /> Lock attendance
                </Button>
              )}
            </div>
          }
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel><p className="text-xs text-muted-foreground">Present</p><p className="mt-1 text-2xl">{summaryData.present_students}/{summaryData.total_students}</p></Panel>
          <Panel><p className="text-xs text-muted-foreground">Date</p><p className="mt-1 text-2xl">{fmtDate(summaryData.starts_at)}</p></Panel>
          <Panel><p className="text-xs text-muted-foreground">Session</p><p className="mt-1 text-2xl">{fmtTime(summaryData.starts_at)}</p></Panel>
          <Panel><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-2xl">{selectedSessionData?.is_active ? "Active" : selectedSessionData?.attendance_locked ? "Locked" : "Ended"}</p></Panel>
        </div>

        {editable && (
          <div className="mb-4 max-w-md">
            <input
              placeholder="Override reason (optional)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>
        )}

        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Batch</th>
                  <th className="px-5 py-4 text-center">Detections</th>
                  <th className="px-5 py-4">Ratio</th>
                  <th className="px-5 py-4">Biometric</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summaryData.records.map((r) => (
                  <tr key={r.student_user_id} className="hover:bg-surface-2/40">
                    <td className="px-5 py-4">
                      <div className="leading-tight">
                        <p className="text-foreground">{r.student_name}</p>
                        <p className="text-xs text-muted-foreground">{r.student_id ?? r.student_user_id}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{selectedAssignmentData?.batch_label ?? "All"}</td>
                    <td className="px-5 py-4 text-center tabular-nums">{r.detection_count}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(r.presence_ratio * 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-xs text-muted-foreground">{Math.round(r.presence_ratio * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {r.biometric_verified ? (
                        <span className="inline-flex items-center gap-1 text-sm text-[#3d6b4d]"><Fingerprint className="size-4" /> Verified</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusChip tone={r.is_present ? "present" : "absent"}>{r.is_present ? "Present" : "Absent"}</StatusChip>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="outline" size="sm" disabled={!editable} className="rounded-xl" onClick={() => overrideMut.mutate({ studentId: r.student_user_id, isPresent: !r.is_present })}>
                        Mark {r.is_present ? "Absent" : "Present"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  }

  if (selectedAssignmentData) {
    const assignmentSessions = (sessions as TeacherSession[]).filter((s) => s.assignment_id === selectedAssignmentData.id);

    return (
      <>
        <PageHeader
          back={
            <button onClick={() => setSelectedAssignment(null)} className="mb-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to assignments
            </button>
          }
          title={selectedAssignmentData.subject_name}
          subtitle={`${selectedAssignmentData.subject_code} · ${selectedAssignmentData.division_label}${selectedAssignmentData.batch_label ? ` · Batch ${selectedAssignmentData.batch_label}` : ""}`}
        />

        {assignmentSessions.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title="No sessions recorded yet"
            description="Once you start attendance, the session history will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assignmentSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                className="rounded-lg border border-border bg-card p-5 text-left transition-all hover:shadow-[0_14px_26px_-20px_rgba(42,41,37,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground">{fmtDate(s.starts_at)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fmtTime(s.starts_at)}{s.ends_at ? ` - ${fmtTime(s.ends_at)}` : ""}
                    </p>
                  </div>
                  <StatusChip tone={s.attendance_locked ? "locked" : s.is_active ? "active" : "ended"} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-4" /> {s.room ?? "Room"}</span>
                  {s.finalization_open && <StatusChip tone="warning">Finalization open</StatusChip>}
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Attendance Sessions"
        subtitle="Grouped by assignment, then drilled into by session."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search classes"
              className="h-11 w-72 rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
            />
          </div>
        }
      />

      {filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title="No matching assignments"
          description="Try a different subject, division, or batch."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAssignments.map((a) => {
            const count = (sessions as TeacherSession[]).filter((s) => s.assignment_id === a.id).length;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAssignment(a.id)}
                className="rounded-lg border border-border bg-card p-5 text-left transition-all hover:shadow-[0_14px_26px_-20px_rgba(42,41,37,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground">{a.subject_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{a.subject_code}</p>
                  </div>
                  <StatusChip tone={a.batch_label ? "lab" : "lecture"}>{a.batch_label ? "Lab" : "Lecture"}</StatusChip>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{a.division_label}{a.batch_label ? ` · Batch ${a.batch_label}` : ""}</span>
                  <span>{count} session{count === 1 ? "" : "s"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
