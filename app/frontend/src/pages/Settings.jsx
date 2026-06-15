import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http, getApiKey, setApiKey, fmtTs } from "@/lib/api";
import { PageHeader, Btn } from "@/components/Layout";

export default function Settings() {
  const qc = useQueryClient();
  const [currentKey, setCurrentKey] = useState(getApiKey());
  const { data } = useQuery({ queryKey: ["workspace"], queryFn: async () => (await http.get("/v1/workspace")).data });
  const [label, setLabel] = useState("");

  async function saveKey() {
    setApiKey(currentKey);
    qc.invalidateQueries();
    toast.success("API key saved");
  }

  async function createKey() {
    try {
      const { data: k } = await http.post("/v1/workspace/keys", { label: label || "additional" });
      toast.success(`Key created: ${k.key}`);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["workspace"] });
    } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  }

  return (
    <div data-testid="page-settings">
      <PageHeader testid="settings-header" title="API Keys" subtitle="Use these to send events from your SDK or HTTP client." />
      <div className="p-8 space-y-8">
        <section className="border border-border bg-white p-6" data-testid="active-key-card">
          <div className="overline">Active API Key (this browser)</div>
          <div className="mt-3 flex gap-3">
            <input
              data-testid="active-key-input"
              value={currentKey}
              onChange={(e) => setCurrentKey(e.target.value)}
              className="flex-1 h-9 border border-border rounded-sm px-3 font-mono text-sm"
            />
            <Btn onClick={saveKey} data-testid="active-key-save">Save</Btn>
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-mono">The local seed includes a demo key for smoke testing.</div>
        </section>

        <section className="border border-border bg-white" data-testid="keys-list-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="overline">Workspace</div>
              <div className="font-mono text-sm mt-1">{data?.workspace?.name} · {data?.workspace?.currency}</div>
            </div>
            <div className="flex gap-2">
              <input
                data-testid="new-key-label"
                placeholder="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 border border-border rounded-sm px-3 font-mono text-sm"
              />
              <Btn onClick={createKey} data-testid="new-key-create">+ New Key</Btn>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-border">
              <tr>
                <Th>Label</Th><Th>Key</Th><Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {(data?.api_keys || []).map((k) => (
                <tr key={k.id} className="border-b border-border" data-testid={`key-row-${k.id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{k.label}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all">{k.key}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{fmtTs(k.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-4 py-3 overline font-medium">{children}</th>;
}
