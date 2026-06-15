import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http, inr, num, fmtTs } from "@/lib/api";
import { PageHeader, Btn, Pill } from "@/components/Layout";

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Reconciliation() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(defaultPeriod());
  const runs = useQuery({ queryKey: ["recon"], queryFn: async () => (await http.get("/v1/reconciliation")).data });
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { data } = await http.post("/v1/reconciliation/run", { period });
      setActive(data);
      toast.success(`Reconciliation ${data.status}`);
      qc.invalidateQueries({ queryKey: ["recon"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  }

  const current = active || runs.data?.runs?.[0];

  return (
    <div data-testid="page-reconciliation">
      <PageHeader
        testid="recon-header"
        title="Reconciliation"
        subtitle="Compare raw accepted events vs. metered usage vs. calculated charges."
        actions={
          <div className="flex gap-2 items-center">
            <input
              data-testid="recon-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM"
              className="h-9 border border-border rounded-sm px-3 font-mono text-sm w-32"
            />
            <Btn onClick={run} disabled={busy} data-testid="recon-run-btn">{busy ? "Running…" : "Run Reconciliation"}</Btn>
          </div>
        }
      />
      <div className="grid grid-cols-[320px_1fr] min-h-[calc(100vh-90px)]">
        <aside className="border-r border-border bg-white" data-testid="recon-runs-list">
          {(runs.data?.runs || []).map((r) => (
            <button
              key={r.id}
              data-testid={`recon-run-${r.id}`}
              onClick={() => setActive(r)}
              className={`w-full text-left px-5 py-3 border-b border-border transition-colors ${
                current?.id === r.id ? "bg-black/5" : "hover:bg-black/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{r.period}</span>
                <Pill tone={r.status === "match" ? "accepted" : "rejected"}>{r.status}</Pill>
              </div>
              <div className="font-mono text-[11px] text-neutral-500 mt-1">{fmtTs(r.started_at)}</div>
              <div className="font-mono text-[11px] text-neutral-500">{r.summary?.issue_count ?? 0} issues</div>
            </button>
          ))}
          {(!runs.data?.runs || runs.data.runs.length === 0) && (
            <div className="p-5 text-sm text-neutral-500 font-mono">No runs yet. Click Run Reconciliation.</div>
          )}
        </aside>
        <div>
          {current ? <RunDetail run={current} /> : <div className="p-8 font-mono text-sm text-neutral-500">Select a run.</div>}
        </div>
      </div>
    </div>
  );
}

function RunDetail({ run }) {
  const s = run.summary || {};
  return (
    <div data-testid="recon-detail">
      <div className="grid grid-cols-4 border-l border-t border-border">
        <Cell label="Status" value={run.status} accent={run.status === "match" ? "text-emerald-600" : "text-red-600"} />
        <Cell label="Raw Events" value={num(s.total_raw_events)} />
        <Cell label="Metered Units" value={num(s.total_metered_units)} />
        <Cell label="Estimated Charge" value={inr(s.total_estimated_charge)} />
        <Cell label="Duplicates Blocked" value={num(s.duplicates_blocked)} />
        <Cell label="Unknown Customers" value={num(s.unknown_customers)} accent={s.unknown_customers ? "text-amber-600" : ""} />
        <Cell label="Unknown Meters" value={num(s.unknown_meters)} accent={s.unknown_meters ? "text-amber-600" : ""} />
        <Cell label="Issues" value={num(s.issue_count)} accent={s.issue_count ? "text-red-600" : "text-emerald-600"} />
      </div>
      <div className="p-6">
        <div className="overline mb-3">Issues</div>
        {run.issues?.length === 0 ? (
          <div className="border border-border bg-emerald-50 text-emerald-700 px-4 py-3 rounded-sm font-mono text-sm">All sources reconcile. No mismatches detected.</div>
        ) : (
          <table className="w-full text-sm border border-border" data-testid="recon-issues-table">
            <thead className="bg-white">
              <tr>
                <Th>Code</Th><Th>Customer</Th><Th>Meter</Th><Th>Raw</Th><Th>Metered</Th><Th>Δ</Th><Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {run.issues.map((i, idx) => (
                <tr key={idx} className="border-t border-border" data-testid={`recon-issue-${idx}`}>
                  <td className="px-3 py-2"><Pill tone={i.code.includes("UNKNOWN") ? "duplicate" : "rejected"}>{i.code}</Pill></td>
                  <td className="px-3 py-2 font-mono text-xs">{i.customer_id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{i.meter_slug || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular">{i.raw_value ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular">{i.metered_value ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular text-red-600">{i.difference ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-neutral-600">{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, accent }) {
  return (
    <div className="border-r border-b border-border bg-white p-5">
      <div className="overline">{label}</div>
      <div className={`text-2xl font-mono mt-2 tabular ${accent || ""}`}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 overline font-medium border-b border-border">{children}</th>;
}

