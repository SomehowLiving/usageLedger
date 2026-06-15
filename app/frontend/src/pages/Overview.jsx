import React from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { http, inr, num } from "@/lib/api";
import { PageHeader, Metric, Pill } from "@/components/Layout";

export default function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => (await http.get("/v1/overview")).data,
    refetchInterval: 8000,
  });

  return (
    <div data-testid="page-overview">
      <PageHeader
        testid="overview-header"
        title="Workspace Overview"
        subtitle="Real-time ingestion, metering, and revenue signals."
      />
      <div className="p-8 space-y-8">
        {isLoading || !data ? (
          <div className="font-mono text-sm text-neutral-500">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-4 border-l border-t border-border" data-testid="overview-metrics">
              <Metric testid="metric-accepted" label="Accepted Events · Period" value={num(data.accepted_events)} sub={data.period} />
              <Metric testid="metric-duplicates" label="Duplicates Blocked" value={num(data.duplicates_blocked)} sub="all-time" accent="text-amber-600" />
              <Metric testid="metric-dlq" label="DLQ Pending" value={num(data.dlq_pending)} sub={`${data.dlq_total} lifetime`} accent={data.dlq_pending ? "text-red-600" : ""} />
              <Metric testid="metric-mrr" label="MRR Estimate" value={inr(data.mrr_estimate)} sub={`for ${data.period}`} />
              <Metric testid="metric-customers" label="Customers" value={num(data.customers)} />
              <Metric testid="metric-meters" label="Meters" value={num(data.meters)} />
              <Metric testid="metric-plans" label="Pricing Plans" value={num(data.plans)} />
              <Metric testid="metric-period" label="Billing Period" value={data.period} mono />
            </div>

            <section className="border border-border bg-white" data-testid="chart-daily-events">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="overline">Daily Accepted Events</div>
                  <div className="font-mono text-sm mt-1">Period {data.period}</div>
                </div>
                <Pill tone="info">live</Pill>
              </div>
              <div className="p-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily_events} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E5E5E5" strokeDasharray="2 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#A3A3A3" />
                    <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} stroke="#A3A3A3" />
                    <Tooltip
                      contentStyle={{ background: "#0A0A0A", border: "none", borderRadius: 2, color: "#FAFAFA", fontFamily: "IBM Plex Mono", fontSize: 12 }}
                      labelStyle={{ color: "#FAFAFA" }}
                    />
                    <Bar dataKey="count" fill="#0A0A0A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="border border-border bg-white p-5" data-testid="overview-quickstart">
              <div className="overline mb-3">Quickstart</div>
              <div className="font-mono text-xs whitespace-pre-wrap text-neutral-700 bg-[#0A0A0A] text-neutral-200 p-4 rounded-sm overflow-x-auto">
{`curl -X POST $API/v1/events \\
  -H "X-API-Key: ulk_demo_secret_key_xyz" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_id": "evt_001",
    "customer_id": "cust_123",
    "event_type": "llm_tokens",
    "timestamp": "${new Date().toISOString()}",
    "properties": {"model":"gpt-5","input_tokens":1200,"output_tokens":450}
  }'`}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

