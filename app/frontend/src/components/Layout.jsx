import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3, Zap, List, Gauge, Receipt, ArrowLeftRight,
  TriangleAlert, Users, Key,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Overview", icon: BarChart3, end: true, testid: "nav-overview" },
  { to: "/ingest", label: "Ingest", icon: Zap, testid: "nav-ingest" },
  { to: "/events", label: "Event Ledger", icon: List, testid: "nav-events" },
  { to: "/meters", label: "Meters", icon: Gauge, testid: "nav-meters" },
  { to: "/pricing", label: "Pricing", icon: Receipt, testid: "nav-pricing" },
  { to: "/customers", label: "Customers", icon: Users, testid: "nav-customers" },
  { to: "/reconciliation", label: "Reconciliation", icon: ArrowLeftRight, testid: "nav-reconciliation" },
  { to: "/dlq", label: "Dead Letter", icon: TriangleAlert, testid: "nav-dlq" },
  { to: "/settings", label: "API Keys", icon: Key, testid: "nav-settings" },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#FAFAFA] text-[#0A0A0A]" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-white sticky top-0 h-screen flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0A0A0A] grid place-items-center">
              <div className="w-2.5 h-2.5 bg-[#FAFAFA]" />
            </div>
            <div>
              <div className="font-mono text-[15px] font-semibold tracking-tight leading-none">UsageLedger</div>
              <div className="overline mt-1">v1.0 · INR</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(({ to, label, icon: Icon, end, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
                  isActive
                    ? "border-[#0A0A0A] bg-black/[0.03] text-[#0A0A0A] font-medium"
                    : "border-transparent text-neutral-600 hover:text-[#0A0A0A] hover:bg-black/[0.02]"
                }`
              }
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <div className="overline mb-1">Demo Workspace</div>
          <div className="font-mono text-xs text-neutral-700 break-all">AI API Co</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, testid }) {
  return (
    <header className="border-b border-border bg-white px-8 py-5 flex items-end justify-between sticky top-0 z-10" data-testid={testid}>
      <div>
        <h1 className="text-2xl tracking-tight font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Metric({ label, value, mono = true, sub, testid, accent }) {
  return (
    <div className="border-r border-b border-border bg-white p-5" data-testid={testid}>
      <div className="overline">{label}</div>
      <div className={`mt-3 ${mono ? "font-mono" : ""} text-[28px] leading-none tracking-tight tabular ${accent || ""}`}>{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-2 font-mono">{sub}</div>}
    </div>
  );
}

export function Pill({ tone = "neutral", children, testid }) {
  const cls = `badge badge-${tone}`;
  return (
    <span className={cls} data-testid={testid}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function Btn({ variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-sm transition-colors disabled:opacity-50";
  const styles = {
    primary: "bg-[#0A0A0A] text-white hover:bg-[#262626]",
    outline: "border border-[#0A0A0A] text-[#0A0A0A] hover:bg-black/5",
    ghost: "text-[#0A0A0A] hover:bg-black/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
