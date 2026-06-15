import React, { useState } from "react";
import { toast } from "sonner";
import { http } from "@/lib/api";
import { PageHeader, Btn, Pill } from "@/components/Layout";

const SAMPLE = `[
  {
    "event_id": "evt_demo_${Date.now()}_a",
    "customer_id": "cust_123",
    "event_type": "llm_tokens",
    "timestamp": "${new Date().toISOString()}",
    "properties": {"model":"gpt-5","input_tokens":1500,"output_tokens":600}
  },
  {
    "event_id": "evt_demo_${Date.now()}_b",
    "customer_id": "cust_456",
    "event_type": "api_request",
    "timestamp": "${new Date().toISOString()}",
    "properties": {"endpoint":"/generate","region":"ap-south-1"}
  }
]`;

export default function Ingest() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const parsed = JSON.parse(text);
      const events = Array.isArray(parsed) ? parsed : [parsed];
      const { data } = await http.post("/v1/events/batch", events);
      setResult(data);
      toast.success(`Accepted ${data.accepted} · Duplicates ${data.duplicates} · Rejected ${data.rejected}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      toast.error(`Ingest failed: ${msg}`);
      setResult({ error: msg });
    } finally {
      setBusy(false);
    }
  }

  async function uploadCsv(file) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await http.post("/v1/events/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success("CSV processed");
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="page-ingest">
      <PageHeader
        testid="ingest-header"
        title="Event Ingestion Console"
        subtitle="Paste raw JSON events or upload a CSV backfill. The platform validates, de-dupes, and persists."
        actions={
          <>
            <label className="inline-flex items-center h-9 px-4 text-sm border border-[#0A0A0A] rounded-sm cursor-pointer hover:bg-black/5" data-testid="ingest-upload-csv">
              Upload CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCsv(e.target.files[0])} />
            </label>
            <Btn onClick={send} disabled={busy} data-testid="ingest-send-btn">{busy ? "Sending…" : "Ingest →"}</Btn>
          </>
        }
      />
      <div className="grid grid-cols-2 min-h-[calc(100vh-90px)]">
        <div className="border-r border-border bg-[#0A0A0A] p-0 flex flex-col">
          <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="overline text-neutral-400">Request · JSON Array</div>
            <span className="font-mono text-[11px] text-neutral-500">POST /api/v1/events/batch</span>
          </div>
          <textarea
            data-testid="ingest-textarea"
            className="flex-1 bg-[#0A0A0A] text-neutral-200 font-mono text-[13px] leading-relaxed px-5 py-4 outline-none resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="bg-white p-0 flex flex-col">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="overline">Response</div>
            {result && !result.error && (
              <Pill tone={result.rejected ? "rejected" : result.duplicates ? "duplicate" : "accepted"}>
                {result.rejected ? "issues" : result.duplicates ? "with duplicates" : "all accepted"}
              </Pill>
            )}
          </div>
          {!result ? (
            <div className="p-8 text-sm text-neutral-500 font-mono">Run the request to see results.</div>
          ) : result.error ? (
            <div className="p-8 font-mono text-sm text-red-600">{String(result.error)}</div>
          ) : (
            <>
              <div className="grid grid-cols-3 border-b border-border" data-testid="ingest-result-summary">
                <div className="p-5 border-r border-border">
                  <div className="overline">Accepted</div>
                  <div className="text-3xl font-mono mt-2 text-emerald-600 tabular">{result.accepted}</div>
                </div>
                <div className="p-5 border-r border-border">
                  <div className="overline">Duplicates</div>
                  <div className="text-3xl font-mono mt-2 text-amber-600 tabular">{result.duplicates}</div>
                </div>
                <div className="p-5">
                  <div className="overline">Rejected</div>
                  <div className="text-3xl font-mono mt-2 text-red-600 tabular">{result.rejected}</div>
                </div>
              </div>
              <div className="p-5 overflow-auto flex-1">
                <div className="overline mb-3">Per-event detail</div>
                <div className="space-y-1.5">
                  {(result.details || []).map((d, i) => (
                    <div key={i} className="flex items-start gap-3 font-mono text-xs border-b border-border pb-1.5">
                      <Pill tone={d.status === "accepted" ? "accepted" : d.status === "duplicate" ? "duplicate" : "rejected"}>{d.status}</Pill>
                      <code className="text-neutral-700">{d.event_id || "(no id)"}</code>
                      {d.errors && (
                        <code className="text-red-600">
                          {d.errors.map((e) => `${e.field || ""} ${e.code}`).join(", ")}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

