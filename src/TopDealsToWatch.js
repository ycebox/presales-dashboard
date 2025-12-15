/* ===== TopDealsToWatch – PresalesOverview Light Theme ===== */
/* Designed to work WITH PresalesOverview.css (taskmix-table styles).
   Avoids overriding table visuals heavily; focuses on card + pills + states. */

:root {
  --td-bg: #ffffff;
  --td-ink: #0b1220;       /* dark/black */
  --td-ink-2: #111827;
  --td-muted: #475569;     /* slate */
  --td-muted-2: #64748b;
  --td-border: rgba(148, 163, 184, 0.55);
  --td-border-2: rgba(148, 163, 184, 0.35);
  --td-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);

  --td-primary: #1d4ed8;   /* deep blue */
  --td-primary-2: #1e40af;
  --td-primary-soft: rgba(29, 78, 216, 0.12);

  --td-success: #16a34a;
  --td-success-soft: rgba(22, 163, 74, 0.12);

  --td-warn: #d97706;
  --td-warn-soft: rgba(217, 119, 6, 0.14);

  --td-danger: #dc2626;
  --td-danger-soft: rgba(220, 38, 38, 0.12);

  --td-radius: 16px;
  --td-radius-sm: 12px;
  --td-focus: rgba(29, 78, 216, 0.22);
}

/* OUTER CARD */
.topdeals-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--td-border);
  box-shadow: var(--td-shadow);
  border-radius: var(--td-radius);
  padding: 14px 16px;
  color: var(--td-ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Segoe UI", sans-serif;
  font-size: 13px;
  position: relative;
  overflow: hidden;
}

/* subtle warm accents inside the card */
.topdeals-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 8%, rgba(29, 78, 216, 0.10), transparent 46%),
    radial-gradient(circle at 86% 16%, rgba(15, 118, 110, 0.07), transparent 50%),
    radial-gradient(circle at 55% 92%, rgba(234, 179, 8, 0.06), transparent 55%);
  opacity: 0.9;
}

/* keep content above accents */
.topdeals-card > * {
  position: relative;
  z-index: 1;
}

/* HEADER */
.topdeals-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.topdeals-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topdeals-title {
  font-size: 14px; /* widget title (page title stays in the page header) */
  font-weight: 750;
  color: var(--td-ink);
  letter-spacing: -0.01em;
}

.topdeals-subtitle {
  font-size: 12px;
  color: var(--td-muted);
  margin-top: 2px;
  line-height: 1.35;
}

.topdeals-icon {
  width: 18px;
  height: 18px;
  color: var(--td-primary);
}

/* VIEW TOGGLE */
.topdeals-view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid var(--td-border);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
}

.topdeals-toggle-btn {
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--td-muted);
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.topdeals-toggle-btn:hover {
  background: rgba(148, 163, 184, 0.12);
  color: var(--td-ink);
}

.topdeals-toggle-btn.active {
  background: var(--td-primary);
  color: #ffffff;
  border-color: transparent;
}

/* CORPORATE BADGE */
.topdeals-corp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 750;
  border: 1px solid rgba(29, 78, 216, 0.28);
  background: var(--td-primary-soft);
  color: var(--td-ink);
  white-space: nowrap;
}

.topdeals-corp-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--td-primary);
  box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.18);
}

/* TABLE WRAPPER (table styles come from PresalesOverview/taskmix) */
.topdeals-table-wrapper {
  margin-top: 10px;
  border-radius: var(--td-radius);
  overflow: hidden;
  border: 1px solid var(--td-border-2);
  background: rgba(255, 255, 255, 0.92);
}

/* keep your existing class in case it's used */
.topdeals-table {
  width: 100%;
}

/* Pills inside table */
.topdeals-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 750;
  border: 1px solid var(--td-border);
  background: #ffffff;
  color: var(--td-ink);
  white-space: nowrap;
}

.topdeals-stage-pill {
  border-color: rgba(29, 78, 216, 0.25);
  background: rgba(29, 78, 216, 0.10);
  color: #1e3a8a;
}

.topdeals-urgency-pill {
  border-color: var(--td-border);
  background: #ffffff;
  color: var(--td-ink);
}

/* urgency variants (soft, readable) */
.topdeals-urgency-pill.urgency-overdue {
  border-color: rgba(220, 38, 38, 0.25);
  background: var(--td-danger-soft);
  color: #991b1b;
}

.topdeals-urgency-pill.urgency-today {
  border-color: rgba(217, 119, 6, 0.28);
  background: var(--td-warn-soft);
  color: #7c2d12;
}

.topdeals-urgency-pill.urgency-soon {
  border-color: rgba(29, 78, 216, 0.22);
  background: rgba(29, 78, 216, 0.10);
  color: #1e3a8a;
}

.topdeals-urgency-pill.urgency-later {
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(148, 163, 184, 0.10);
  color: var(--td-muted);
}

/* Money/value styling */
.topdeals-value {
  font-weight: 750;
  color: var(--td-ink);
}

/* Text truncation helpers */
.topdeals-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topdeals-multiline-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* GRID MODE */
.topdeals-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.topdeals-grid-card {
  border: 1px solid var(--td-border);
  background: rgba(255, 255, 255, 0.94);
  border-radius: var(--td-radius);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
  padding: 12px 12px;
  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}

.topdeals-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
  border-color: rgba(29, 78, 216, 0.28);
}

.topdeals-grid-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--td-ink);
  margin-bottom: 4px;
}

.topdeals-grid-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

/* STATES */
.topdeals-loading,
.topdeals-error,
.topdeals-empty {
  padding: 18px 10px;
  text-align: center;
  color: var(--td-muted);
}

.topdeals-error {
  color: #991b1b;
}

.topdeals-empty-title {
  font-size: 13px;
  font-weight: 750;
  color: var(--td-ink);
  margin-bottom: 6px;
}

.topdeals-empty-desc {
  font-size: 12px;
  color: var(--td-muted);
  max-width: 460px;
  margin: 0 auto;
  line-height: 1.45;
}

/* Spinner */
.topdeals-spinner {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(148, 163, 184, 0.45);
  border-top-color: var(--td-primary);
  animation: td-spin 1s linear infinite;
  margin: 0 auto 10px;
}

/* Accessibility */
.topdeals-toggle-btn:focus-visible,
.topdeals-grid-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--td-focus);
}

/* Column helpers (kept, but don’t force colors) */
.th-center {
  text-align: center;
}

.td-center {
  text-align: center;
}

/* RESPONSIVE */
@media (max-width: 1100px) {
  .topdeals-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .topdeals-card {
    padding: 12px 12px;
  }

  .topdeals-header {
    flex-direction: column;
    gap: 8px;
  }

  .topdeals-view-toggle {
    width: 100%;
    justify-content: center;
  }

  .topdeals-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes td-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
