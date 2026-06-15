import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Overview from "@/pages/Overview";
import Ingest from "@/pages/Ingest";
import Events from "@/pages/Events";
import Meters from "@/pages/Meters";
import Pricing from "@/pages/Pricing";
import Customers from "@/pages/Customers";
import Reconciliation from "@/pages/Reconciliation";
import DeadLetter from "@/pages/DeadLetter";
import Settings from "@/pages/Settings";
import "@/App.css";

function App() {
  return (
    <div className="App">
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/ingest" element={<Ingest />} />
            <Route path="/events" element={<Events />} />
            <Route path="/meters" element={<Meters />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/dlq" element={<DeadLetter />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

