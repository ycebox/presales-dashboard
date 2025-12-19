import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./TopDealsToWatch.css";

const currency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const urgencyForDueDate = (dueDate) => {
  if (!dueDate) return { label: "No due date", cls: "urgency-later" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", cls: "urgency-overdue" };
  if (diffDays === 0) return { label: "Due today", cls: "urgency-today" };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, cls: "urgency-soon" };
  return { label: `Due in ${diffDays}d`, cls: "urgency-later" };
};

const normalizeStage = (s) => String(s || "").trim();

const isCompletedStage = (stage) => {
  const s = normalizeStage(stage).toLowerCase();
  if (!s) return false;
  if (s === "done") return true;
  if (s.includes("closed")) return true;
  if (s.includes("completed")) return true;
  return false;
};

export default function TopDealsToWatch({
  limit = 10,
  hideCompleted = true,
  title = "Top Deals to Watch",
  subtitle = "Highest value opportunities with a quick read on status + corporate tag",
}) {
  const navigate = useNavigate();

  const [view, setView] = useState("table"); // table | grid
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deals, setDeals] = useState([]);

  // customer_name -> customer_id map (for clickable customer link)
  const [customerIdMap, setCustomerIdMap] = useState({});

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch deals (projects)
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select(
          "id, customer_name, project_name, sales_stage, deal_value, due_date, current_status, is_corporate"
        )
        .order("deal_value", { ascending: false })
        .limit(limit * 3); // fetch more then filter

      if (pErr) throw pErr;

      let rows = projects || [];

      if (hideCompleted) {
        rows = rows.filter((p) => !isCompletedStage(p.sales_stage));
      }

      // Trim to limit after filtering
      rows = rows.slice(0, limit);

      setDeals(rows);

      // Resolve customer IDs for clickable customer links
      const uniqueNames = Array.from(
        new Set(rows.map((r) => String(r.customer_name || "").trim()).filter(Boolean))
      );

      if (uniqueNames.length === 0) {
        setCustomerIdMap({});
        return;
      }

      const { data: customers, error: cErr } = await supabase
        .from("customers")
        .select("id, customer_name")
        .in("customer_name", uniqueNames);

      if (cErr) throw cErr;

      const map = {};
      (customers || []).forEach((c) => {
        map[String(c.customer_name || "").trim()] = c.id;
      });
      setCustomerIdMap(map);
    } catch (e) {
      console.error("TopDealsToWatch fetch error:", e);
      setError(e?.message || "Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, hideCompleted]);

  const hasCorporate = useMemo(() => deals.some((d) => !!d.is_corporate), [deals]);

  const goCustomer = (customerName) => {
    const id = customerIdMap[String(customerName || "").trim()];
    if (!id) return;
    navigate(`/customer/${id}`);
  };

  const goProject = (projectId) => {
    if (!projectId) return;
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="topdeals-card">
      <div className="topdeals-header">
        <div>
          <div className="topdeals-title-row">
            <div className="topdeals-title">{title}</div>
          </div>
          <div className="topdeals-subtitle">{subtitle}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {hasCorporate ? (
            <span className="topdeals-corp-badge" title="Corporate opportunity = global team involved">
              <span className="topdeals-corp-badge-dot" />
              Corporate tagged
            </span>
          ) : null}

          <div className="topdeals-view-toggle" role="tablist" aria-label="Top deals view toggle">
            <button
              type="button"
              className={`topdeals-toggle-btn ${view === "table" ? "active" : ""}`}
              onClick={() => setView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={`topdeals-toggle-btn ${view === "grid" ? "active" : ""}`}
              onClick={() => setView("grid")}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="topdeals-loading">
          <div className="topdeals-spinner" />
          Loading deals...
        </div>
      ) : error ? (
        <div className="topdeals-error">
          {error}
          <div style={{ marginTop: 10 }}>
            <button className="topdeals-toggle-btn active" onClick={fetchDeals} type="button">
              Retry
            </button>
          </div>
        </div>
      ) : deals.length === 0 ? (
        <div className="topdeals-empty">
          <div className="topdeals-empty-title">No deals to show</div>
          <div className="topdeals-empty-desc">
            If you expect deals here, check your projects table values (sales_stage / deal_value) and filters.
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="topdeals-grid">
          {deals.map((d) => {
            const stage = normalizeStage(d.sales_stage) || "—";
            const urg = urgencyForDueDate(d.due_date);

            return (
              <div key={d.id} className="topdeals-grid-card">
                <div className="topdeals-grid-title topdeals-ellipsis">
                  <button
                    type="button"
                    onClick={() => goProject(d.id)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      color: "inherit",
                      fontWeight: 800,
                    }}
                    title="Open project details"
                  >
                    {d.project_name || "(Unnamed Project)"}
                  </button>
                </div>

                <div className="topdeals-subtitle topdeals-ellipsis">
                  <button
                    type="button"
                    onClick={() => goCustomer(d.customer_name)}
                    disabled={!customerIdMap[String(d.customer_name || "").trim()]}
                    style={{
                      all: "unset",
                      cursor: customerIdMap[String(d.customer_name || "").trim()] ? "pointer" : "default",
                      color: "inherit",
                      textDecoration: customerIdMap[String(d.customer_name || "").trim()]
                        ? "underline"
                        : "none",
                    }}
                    title="Open customer details"
                  >
                    {d.customer_name || "—"}
                  </button>
                </div>

                <div className="topdeals-grid-meta">
                  <span className="topdeals-pill topdeals-stage-pill">{stage}</span>
                  <span className={`topdeals-pill topdeals-urgency-pill ${urg.cls}`}>{urg.label}</span>
                  {d.is_corporate ? (
                    <span className="topdeals-pill" title="Corporate opportunity">
                      Corporate
                    </span>
                  ) : null}
                  <span className="topdeals-pill topdeals-value">{currency(d.deal_value)}</span>
                </div>

                <div style={{ marginTop: 8 }} className="topdeals-multiline-ellipsis" title={d.current_status || ""}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>Status:</span>{" "}
                  {d.current_status ? d.current_status : "—"}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="topdeals-table-wrapper">
          <table className="topdeals-table taskmix-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Project</th>
                <th className="th-center">Stage</th>
                <th className="th-center">Value</th>
                <th>Current Status</th>
                <th className="th-center">Corporate</th>
              </tr>
            </thead>

            <tbody>
              {deals.map((d) => {
                const stage = normalizeStage(d.sales_stage) || "—";
                const urg = urgencyForDueDate(d.due_date);
                const customerKey = String(d.customer_name || "").trim();
                const customerId = customerIdMap[customerKey];

                return (
                  <tr key={d.id}>
                    <td className="topdeals-ellipsis">
                      <button
                        type="button"
                        onClick={() => goCustomer(d.customer_name)}
                        disabled={!customerId}
                        style={{
                          all: "unset",
                          cursor: customerId ? "pointer" : "default",
                          color: "#0b1220",
                          textDecoration: customerId ? "underline" : "none",
                          fontWeight: 750,
                        }}
                        title={customerId ? "Open customer details" : "Customer not found in customers table"}
                      >
                        {d.customer_name || "—"}
                      </button>
                    </td>

                    <td className="topdeals-ellipsis">
                      <button
                        type="button"
                        onClick={() => goProject(d.id)}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          color: "#0b1220",
                          textDecoration: "underline",
                          fontWeight: 750,
                        }}
                        title="Open project details"
                      >
                        {d.project_name || "(Unnamed Project)"}
                      </button>
                      <div style={{ marginTop: 4 }}>
                        <span className={`topdeals-pill topdeals-urgency-pill ${urg.cls}`}>
                          {urg.label}
                          {d.due_date ? ` • ${formatDate(d.due_date)}` : ""}
                        </span>
                      </div>
                    </td>

                    <td className="td-center">
                      <span className="topdeals-pill topdeals-stage-pill">{stage}</span>
                    </td>

                    <td className="td-center">
                      <span className="topdeals-value">{currency(d.deal_value)}</span>
                    </td>

                    <td className="topdeals-multiline-ellipsis" title={d.current_status || ""}>
                      {d.current_status || "—"}
                    </td>

                    <td className="td-center">
                      {d.is_corporate ? (
                        <span className="topdeals-pill" title="Corporate opportunity (global team involved)">
                          Yes
                        </span>
                      ) : (
                        <span className="topdeals-pill" style={{ opacity: 0.65 }}>
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
