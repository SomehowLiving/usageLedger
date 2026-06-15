import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { http, fmtTs } from "@/lib/api";
import { PageHeader, Pill } from "@/components/Layout";

export default function Events() {
  const [status, setStatus] = useState("");
  const { data } = useQuery({
    queryKey: ["events", status],
    queryFn: async () =>
      (await http.get("/v1/events", { params: { limit: 200, status: status || undefined } })).data,
    refetchInterval: 6000,
  });

  const events = data?.events || [];

  return (
    <div data-testid="page-events">
      <PageHeader
        testid="events-header"
        title="Event Ledger"
        subtitle="Immutable record of every event the platform has seen."
        actions={
          <div className="flex gap-1 border border-border rounded-sm overflow-hidden">
            {[{ k: "", l: "All" }, { k: "accepted", l: "Accepted" }, { k: "duplicate", l: "Duplicates" }].map((b) => (
              <button
                key={b.k}
                data-testid={`events-filter-${b.k || "all"}`}
                className={`px-3 h-9 text-sm ${status === b.k ? "bg-[#0A0A0A] text-white" : "bg-white hover:bg-black/5"}`}
                onClick={() => setStatus(b.k)}
              >
                {b.l}
              </button>
            ))}
          </div>
        }
      />
      <div className="overflow-x-auto" data-testid="events-table">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-border sticky top-0">
            <tr>
              <Th>Status</Th>
              <Th>Event ID</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Occurred</Th>
              <Th>Received</Th>
              <Th>Properties</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-border hover:bg-gray-50/60" data-testid={`event-row-${e.id}`}>
                <td className="px-4 py-2.5">
                  <Pill tone={e.processing_status === "accepted" ? "accepted" : e.processing_status === "duplicate" ? "duplicate" : "rejected"}>
                    {e.processing_status}
                  </Pill>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.external_event_id}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.customer_id}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.event_type}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-600">{fmtTs(e.occurred_at)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-600">{fmtTs(e.received_at)}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-700 max-w-md truncate">
                  {JSON.stringify(e.properties)}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-10 text-center text-neutral-500 font-mono text-sm">No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left px-4 py-3 overline font-medium border-b border-border">{children}</th>
  );
}

