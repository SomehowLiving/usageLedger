import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http, fmtTs } from "@/lib/api";
import { PageHeader, Btn, Pill } from "@/components/Layout";

export default function DeadLetter() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dlq"],
    queryFn: async () => (await http.get("/v1/dead-letter-events", { params: { limit: 200 } })).data,
    refetchInterval: 6000,
  });

  async function retry(id) {
    try {
      const { data: r } = await http.post(`/v1/dead-letter-events/${id}/retry`);
      toast.success(`Retry → ${r.new_status}`);
      qc.invalidateQueries({ queryKey: ["dlq"] });
    } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  }

  async function bulkRetry() {
    try {
      const { data: r } = await http.post(`/v1/dead-letter-events/bulk-retry`);
      toast.success(`Processed ${r.processed} · Resolved ${r.resolved}`);
      qc.invalidateQueries({ queryKey: ["dlq"] });
    } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  }

  const events = data?.events || [];
  const pending = events.filter((e) => e.status === "pending").length;

  return (
    <div data-testid="page-dlq">
      <PageHeader
        testid="dlq-header"
        title="Dead Letter Queue"
        subtitle="Events that failed validation or referenced unknown entities. Fix configuration, then replay."
        actions={<Btn variant="outline" onClick={bulkRetry} disabled={!pending} data-testid="dlq-bulk-retry">Bulk Retry ({pending})</Btn>}
      />
      <table className="w-full text-sm" data-testid="dlq-table">
        <thead className="bg-white border-b border-border">
          <tr>
            <Th>Reason</Th><Th>Status</Th><Th>Event ID</Th><Th>Created</Th>
            <Th>Errors</Th><Th>Payload</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {events.map((d) => (
            <tr key={d.id} className="border-b border-border hover:bg-gray-50/60" data-testid={`dlq-row-${d.id}`}>
              <td className="px-4 py-2.5"><Pill tone="rejected">{d.reason}</Pill></td>
              <td className="px-4 py-2.5"><Pill tone={d.status === "resolved" ? "accepted" : d.status === "retried" ? "duplicate" : "neutral"}>{d.status}</Pill></td>
              <td className="px-4 py-2.5 font-mono text-xs">{d.raw_payload?.event_id || "(none)"}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-600">{fmtTs(d.created_at)}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-red-600">
                {(d.errors || []).map((e) => `${e.code || ""}`).join(", ")}
              </td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-700 max-w-md truncate">
                {JSON.stringify(d.raw_payload)}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  data-testid={`dlq-retry-${d.id}`}
                  className="text-xs text-[#0A0A0A] hover:underline disabled:text-neutral-400"
                  onClick={() => retry(d.id)}
                  disabled={d.status !== "pending"}
                >
                  Retry
                </button>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan="7" className="px-4 py-10 text-center text-emerald-600 font-mono text-sm">Inbox zero · no failed events</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-4 py-3 overline font-medium border-b border-border">{children}</th>;
}

