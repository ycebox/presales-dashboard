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

  // customer_name -> customer_id map for hyperlink
  const [customerIdMap, setCustomerIdMap] = useState({});

  const hasCorporate = useMemo(() => deals.some((d) => !!d.is_corporate), [deals]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError("");

      // 1) Fetch projects (deals)
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

      // 2) Resolve customer ids (because projects only has customer_name)
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
      setError(e?.message || "Failed to load Top Deals");
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
        <div className="topdeals-empty">No deals to show.</div>
      ) : (
        <div className="topdeals-table-wrapper">
          <table className="topdeals-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Project</th>
                <th>Stage</th>
                <th className="th-right">Value</th>
                <th>Current Status</th>
                <th>Corporate</th>
              </tr>
            </thead>

            <tbody>
              {deals.map((d) => {
                const stage = normalizeStage(d.sales_stage) || "—";
                const customerKey = String(d.customer_name || "").trim();
                const customerId = customerIdMap[customerKey];

                return (
                  <tr key={d.id}>
                    {/* CUSTOMER LINK */}
                    <td className="topdeals-cell-ellipsis">
                      {customerId ? (
                        <Link
                          to={`/customer/${customerId}`}
                          className="topdeals-link"
                          title="Open customer details"
                        >
                          {d.customer_name}
                        </Link>
                      ) : (
                        <span title="No matching customer found in customers table">
                          {d.customer_name || "—"}
                        </span>
                      )}
                    </td>

                    {/* PROJECT LINK */}
                    <td className="topdeals-cell-ellipsis">
                      <Link
                        to={`/project/${d.id}`}
                        className="topdeals-link"
                        title="Open project details"
                      >
                        {d.project_name || "(Unnamed Project)"}
                      </Link>
                    </td>

                    <td>
                      <span className="topdeals-stage-pill">{stage}</span>
                    </td>

                    <td className="td-right">
                      <span className="topdeals-value-cell">{currency(d.deal_value)}</span>
                    </td>

                    <td className="topdeals-cell-ellipsis" title={d.current_status || ""}>
                      {d.current_status || "—"}
                    </td>

                    <td>
                      {d.is_corporate ? (
                        <span className="topdeals-corp-badge">Yes</span>
                      ) : (
                        <span style={{ opacity: 0.7 }}>No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* tiny helper if customer names don't map */}
          <div style={{ marginTop: 10, fontSize: "0.85rem", opacity: 0.8 }}>
            Note: customer links work only when <b>projects.customer_name</b> matches exactly the{" "}
            <b>customers.customer_name</b>.
          </div>
        </div>
      )}
    </div>
  );
}
