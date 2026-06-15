import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { http, inr, num } from "@/lib/api";
import { PageHeader, Pill, Metric } from "@/components/Layout";

export default function Customers() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: async () => (await http.get("/v1/customers")).data });
  const [selected, setSelected] = useState(null);

  React.useEffect(() => {
    if (!selected && customers.data?.customers?.length) {
      setSelected(customers.data.customers[0].external_id);
    }
  }, [customers.data, selected]);

  return (
    <div data-testid="page-customers">
      <PageHeader testid="customers-header" title="Customer Usage" subtitle="Per-customer metering & estimated charges." />
      <div className="grid grid-cols-[260px_1fr] min-h-[calc(100vh-90px)]">
        <aside className="border-r border-border bg-white" data-testid="customers-list">
          {(customers.data?.customers || []).map((c) => (
            <button
              key={c.id}
              data-testid={`customer-${c.external_id}`}
              onClick={() => setSelected(c.external_id)}
              className={`w-full text-left px-5 py-3 border-b border-border transition-colors ${
                selected === c.external_id ? "bg-black/5" : "hover:bg-black/[0.02]"
              }`}
            >
              <div className="font-medium text-sm">{c.name}</div>
              <div className="font-mono text-[11px] text-neutral-500">{c.external_id}</div>
            </button>
          ))}
        </aside>
        <div>
          {selected && <CustomerUsage customerId={selected} />}
        </div>
      </div>
    </div>
  );
}

function CustomerUsage({ customerId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["usage", customerId],
    queryFn: async () => (await http.get(`/v1/usage/${customerId}`)).data,
    refetchInterval: 8000,
  });

  if (isLoading || !data) return <div className="p-8 font-mono text-sm text-neutral-500">Loading…</div>;

  return (
    <div data-testid="customer-usage">
      <div className="border-b border-border bg-white px-8 py-6 flex items-center justify-between">
        <div>
          <div className="overline">Customer</div>
          <div className="text-2xl font-mono tracking-tight mt-1">{customerId}</div>
        </div>
        <div className="text-right">
          <div className="overline">Estimated charge · {data.period}</div>
          <div className="text-4xl font-mono mt-1 tabular" data-testid="customer-total-charge">{inr(data.total_charge)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-l border-t border-border">
        {data.meters.map((m) => (
          <div key={m.meter.slug} className="border-r border-b border-border bg-white p-6" data-testid={`usage-meter-${m.meter.slug}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="overline">{m.meter.aggregation} · {m.meter.event_type}</div>
                <div className="text-lg font-medium mt-1">{m.meter.name}</div>
                <div className="font-mono text-xs text-neutral-500">slug: {m.meter.slug}</div>
              </div>
              {m.plan && <Pill tone="info">{m.plan.model}</Pill>}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <Cell label="Used" value={num(m.usage.value)} unit={m.meter.unit_label} />
              <Cell label="Included" value={num(m.charge.included_units)} unit={m.meter.unit_label} />
              <Cell label="Billable" value={num(m.charge.billable_units)} unit={m.meter.unit_label} />
            </div>
            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="overline">Charge</div>
                <div className="text-2xl font-mono mt-1 tabular">{inr(m.charge.charge)}</div>
              </div>
              <div className="text-xs text-neutral-500 font-mono text-right max-w-[60%]">
                {typeof m.charge.detail === "string" ? m.charge.detail :
                  Array.isArray(m.charge.detail)
                    ? m.charge.detail.map((t, i) => <div key={i}>tier ≤ {t.up_to ?? "∞"} · {t.units} × ₹{t.rate} = ₹{t.amount}</div>)
                    : null}
              </div>
            </div>
            {m.usage.breakdown?.length > 0 && (
              <div className="mt-5">
                <div className="overline mb-2">Breakdown</div>
                <table className="w-full text-xs">
                  <tbody>
                    {m.usage.breakdown.map((b, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5 font-mono">{Object.entries(b.group || {}).map(([k, v]) => `${k}=${v ?? "—"}`).join(", ") || "(all)"}</td>
                        <td className="py-1.5 font-mono text-right tabular">{num(b.value)}</td>
                        <td className="py-1.5 font-mono text-right text-neutral-500">{b.event_count} events</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value, unit }) {
  return (
    <div>
      <div className="overline">{label}</div>
      <div className="font-mono text-base mt-1 tabular">{value}</div>
      <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">{unit}</div>
    </div>
  );
}

