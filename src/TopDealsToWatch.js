import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deals, setDeals] = useState([]);
  const [customerIdMap, setCustomerIdMap] = useState({});

  const hasCorporate = useMemo(() => deals.some((d) => !!d.is_corporate), [deals]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError("");

      // 1) Fetch projects
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select(
          "id, customer_name, project_name, sales_stage, deal_value, current_status, is_corporate"
        )
        .order("deal_value", { ascending: false })
        .limit(limit * 3);

      if (pErr) throw pErr;

      let rows = projects || [];
      if (hideCompleted) rows = rows.filter((p) => !isCompletedStage(p.sales_stage));
      rows = rows.slice(0, limit);
      setDeals(rows);

      // 2) Resolve customer ids (projects has only customer_name)
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

  return (
    <div className="topdeals-card">
      <div className="topdeals-header">
        <div className="topdeals-title">
          <h2>{title}</h2>
          {hasCorporate ? (
            <span className="topdeals-corp-badge" title="Corporate opportunity (global team involved)">
              Corporate
            </span>
          ) : null}
        </div>
        <p className="topdeals-subtitle">
          Click customer or project to open details
        </p>
      </div>

      {loading ? (
        <div className="topdeals-loading">
          <div className="topdeals-spinner" />
          Loading deals...
        </div>
      ) : error ? (
        <div className="topdeals-error">
          {error}
        </div>
      ) : deals.length === 0 ? (
        <div className="topdeals-empty">No deals to show.</div>
      ) : (
        <>
          {/* HEADERS (GRID) */}
          <div className="topdeals-table-head">
            <div>#</div>
            <div>Customer</div>
            <div>Project</div>
            <div>Stage</div>
            <div>Value</div>
            <div>Current Status</div>
            <div>Corporate</div>
          </div>

          {/* ROWS (GRID) */}
          <div className="topdeals-list">
            {deals.map((d, idx) => {
              const stage = normalizeStage(d.sales_stage) || "—";
              const customerKey = String(d.customer_name || "").trim();
              const customerId = customerIdMap[customerKey];

              return (
                <div key={d.id} className="topdeals-row">
                  {/* Rank */}
                  <div className="topdeals-rank">{idx + 1}</div>

                  {/* Customer link */}
                  <div className="topdeals-customer-cell">
                    {customerId ? (
                      <Link
                        to={`/customer/${customerId}`}
                        className="topdeals-link"
                        title="Open customer details"
                      >
                        {d.customer_name || "—"}
                      </Link>
                    ) : (
                      <span title="Customer not found in customers table">
                        {d.customer_name || "—"}
                      </span>
                    )}
                  </div>

                  {/* Project link */}
                  <div className="topdeals-project-cell">
                    <Link
                      to={`/project/${d.id}`}
                      className="topdeals-link"
                      title="Open project details"
                    >
                      {d.project_name || "(Unnamed Project)"}
                    </Link>
                  </div>

                  {/* Stage */}
                  <div>
                    <span className="topdeals-stage-badge">{stage}</span>
                  </div>

                  {/* Value */}
                  <div className="topdeals-value-cell">{currency(d.deal_value)}</div>

                  {/* Current Status (NEW) */}
                  <div className="topdeals-status-cell" title={d.current_status || ""}>
                    {d.current_status || "—"}
                  </div>

                  {/* Corporate (NEW) */}
                  <div className="topdeals-corp-cell">
                    {d.is_corporate ? (
                      <span className="topdeals-corp-pill">Yes</span>
                    ) : (
                      <span className="topdeals-corp-pill is-no">No</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
