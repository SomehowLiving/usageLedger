import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { http } from "@/lib/api";
import { PageHeader, Btn } from "@/components/Layout";

const AGG_TYPES = ["COUNT", "SUM", "MAX", "MIN", "UNIQUE_COUNT", "LATEST"];

export default function Meters() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["meters"],
    queryFn: async () => (await http.get("/v1/meters")).data,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    slug: "", name: "", event_type: "", aggregation: "COUNT",
    value_field: "", group_by: "", unit_label: "units",
  });

  async function submit(e) {
    e.preventDefault();
    try {
      await http.post("/v1/meters", {
        ...form,
        value_field: form.value_field || null,
        group_by: form.group_by ? form.group_by.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Meter created");
      setOpen(false);
      setForm({ slug: "", name: "", event_type: "", aggregation: "COUNT", value_field: "", group_by: "", unit_label: "units" });
      qc.invalidateQueries({ queryKey: ["meters"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    }
  }

  async function del(id) {
    if (!window.confirm("Delete this meter?")) return;
    await http.delete(`/v1/meters/${id}`);
    qc.invalidateQueries({ queryKey: ["meters"] });
  }

  return (
    <div data-testid="page-meters">
      <PageHeader
        testid="meters-header"
        title="Meter Definitions"
        subtitle="How raw events become billable usage totals."
        actions={<Btn data-testid="meters-new-btn" onClick={() => setOpen((v) => !v)}>{open ? "Cancel" : "+ New Meter"}</Btn>}
      />
      {open && (
        <form onSubmit={submit} className="border-b border-border bg-white p-6 grid grid-cols-3 gap-4" data-testid="meters-form">
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required testid="meter-slug" />
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="meter-name" />
          <Field label="Event Type" value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} required testid="meter-event-type" />
          <div>
            <div className="overline mb-1.5">Aggregation</div>
            <select
              data-testid="meter-aggregation"
              className="w-full h-9 border border-border rounded-sm font-mono text-sm px-3 bg-white"
              value={form.aggregation}
              onChange={(e) => setForm({ ...form, aggregation: e.target.value })}
            >
              {AGG_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Field label="Value Field (dotted)" value={form.value_field} onChange={(v) => setForm({ ...form, value_field: v })} placeholder="properties.input_tokens" testid="meter-value-field" />
          <Field label="Group By (comma)" value={form.group_by} onChange={(v) => setForm({ ...form, group_by: v })} placeholder="model,endpoint" testid="meter-group-by" />
          <Field label="Unit Label" value={form.unit_label} onChange={(v) => setForm({ ...form, unit_label: v })} testid="meter-unit-label" />
          <div className="col-span-3"><Btn type="submit" data-testid="meter-submit">Save Meter</Btn></div>
        </form>
      )}
      <table className="w-full text-sm" data-testid="meters-table">
        <thead className="bg-white border-b border-border">
          <tr>
            <Th>Slug</Th><Th>Name</Th><Th>Event Type</Th><Th>Aggregation</Th>
            <Th>Value Field</Th><Th>Group By</Th><Th>Unit</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {(data?.meters || []).map((m) => (
            <tr key={m.id} className="border-b border-border hover:bg-gray-50/60" data-testid={`meter-row-${m.slug}`}>
              <td className="px-4 py-3 font-mono text-xs">{m.slug}</td>
              <td className="px-4 py-3">{m.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{m.event_type}</td>
              <td className="px-4 py-3 font-mono text-xs">{m.aggregation}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600">{m.value_field || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600">{(m.group_by || []).join(", ") || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-600">{m.unit_label}</td>
              <td className="px-4 py-3 text-right">
                <button data-testid={`meter-delete-${m.slug}`} className="text-xs text-neutral-500 hover:text-red-600" onClick={() => del(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, testid }) {
  return (
    <div>
      <div className="overline mb-1.5">{label}</div>
      <input
        data-testid={testid}
        className="w-full h-9 border border-border rounded-sm font-mono text-sm px-3 bg-white focus:ring-2 focus:ring-black focus:outline-none"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-4 py-3 overline font-medium">{children}</th>;
}

