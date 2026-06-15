import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http, inr } from "@/lib/api";
import { PageHeader, Btn, Pill } from "@/components/Layout";

const MODELS = [
  { v: "flat", l: "Pay-as-you-go (flat rate)" },
  { v: "tiered", l: "Tiered" },
  { v: "volume", l: "Volume (all units at tier rate)" },
  { v: "allowance", l: "Included allowance + overage" },
  { v: "credit", l: "Credit consumption" },
];

export default function Pricing() {
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: async () => (await http.get("/v1/pricing-plans")).data });
  const meters = useQuery({ queryKey: ["meters"], queryFn: async () => (await http.get("/v1/meters")).data });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [meter, setMeter] = useState("");
  const [model, setModel] = useState("flat");
  const [config, setConfig] = useState(`{"rate": 0.01, "per_units": 1}`);

  function setExample(m) {
    setModel(m);
    setConfig(JSON.stringify(EXAMPLES[m], null, 2));
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const cfg = JSON.parse(config);
      await http.post("/v1/pricing-plans", { name, meter_slug: meter, model, config: cfg });
      toast.success("Plan created");
      setOpen(false); setName(""); setMeter(""); setConfig(JSON.stringify(EXAMPLES.flat, null, 2));
      qc.invalidateQueries({ queryKey: ["plans"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    }
  }

  async function del(id) {
    if (!window.confirm("Delete this plan?")) return;
    await http.delete(`/v1/pricing-plans/${id}`);
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  return (
    <div data-testid="page-pricing">
      <PageHeader
        testid="pricing-header"
        title="Pricing Plans"
        subtitle="Flat, tiered, volume, allowance, credit — all configurable."
        actions={<Btn data-testid="pricing-new-btn" onClick={() => setOpen((v) => !v)}>{open ? "Cancel" : "+ New Plan"}</Btn>}
      />
      {open && (
        <form onSubmit={submit} className="border-b border-border bg-white p-6 grid grid-cols-2 gap-6" data-testid="pricing-form">
          <div className="space-y-4">
            <div>
              <div className="overline mb-1.5">Name</div>
              <input data-testid="plan-name" className="w-full h-9 border border-border rounded-sm px-3 font-mono text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <div className="overline mb-1.5">Meter</div>
              <select data-testid="plan-meter" className="w-full h-9 border border-border rounded-sm px-3 font-mono text-sm bg-white" value={meter} onChange={(e) => setMeter(e.target.value)} required>
                <option value="">— Select —</option>
                {(meters.data?.meters || []).map((m) => <option key={m.id} value={m.slug}>{m.slug} ({m.aggregation})</option>)}
              </select>
            </div>
            <div>
              <div className="overline mb-1.5">Pricing Model</div>
              <div className="grid grid-cols-1 gap-1">
                {MODELS.map((m) => (
                  <button
                    type="button"
                    key={m.v}
                    data-testid={`plan-model-${m.v}`}
                    onClick={() => setExample(m.v)}
                    className={`text-left px-3 py-2 border rounded-sm text-sm transition-colors ${model === m.v ? "border-[#0A0A0A] bg-black/5" : "border-border hover:bg-black/[0.02]"}`}
                  >
                    <span className="font-mono text-xs text-neutral-500 mr-2">{m.v}</span>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
            <Btn type="submit" data-testid="plan-submit">Save Plan</Btn>
          </div>
          <div>
            <div className="overline mb-1.5">Config (JSON)</div>
            <textarea data-testid="plan-config" className="w-full h-[340px] border border-border rounded-sm p-3 font-mono text-xs bg-[#0A0A0A] text-neutral-200" value={config} onChange={(e) => setConfig(e.target.value)} />
            <div className="text-xs text-neutral-500 mt-2 font-mono">Currency: INR (₹). Click a model to load example config.</div>
          </div>
        </form>
      )}

      <table className="w-full text-sm" data-testid="pricing-table">
        <thead className="bg-white border-b border-border">
          <tr>
            <Th>Name</Th><Th>Meter</Th><Th>Model</Th><Th>Config</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {(plans.data?.plans || []).map((p) => (
            <tr key={p.id} className="border-b border-border hover:bg-gray-50/60" data-testid={`plan-row-${p.id}`}>
              <td className="px-4 py-3">{p.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.meter_slug}</td>
              <td className="px-4 py-3"><Pill tone="info">{p.model}</Pill></td>
              <td className="px-4 py-3 font-mono text-[11px] text-neutral-700">{JSON.stringify(p.config)}</td>
              <td className="px-4 py-3 text-right">
                <button data-testid={`plan-delete-${p.id}`} className="text-xs text-neutral-500 hover:text-red-600" onClick={() => del(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EXAMPLES = {
  flat: { rate: 0.01, per_units: 1 },
  tiered: { tiers: [{ up_to: 10000, rate: 0.02 }, { up_to: 50000, rate: 0.015 }, { up_to: null, rate: 0.01 }] },
  volume: { tiers: [{ up_to: 10000, rate: 0.02 }, { up_to: 50000, rate: 0.015 }, { up_to: null, rate: 0.01 }] },
  allowance: { included: 10000, rate: 0.01, per_units: 1 },
  credit: { credits_per_unit: 5, credit_rate: 0.5 },
};

function Th({ children }) {
  return <th className="text-left px-4 py-3 overline font-medium">{children}</th>;
}

