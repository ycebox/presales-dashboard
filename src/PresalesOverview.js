/* ProjectDetails.css – PresalesOverview Light Theme (ProjectDetails Page) */
.project-details-container {
  --bg: #f6f9ff;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #475569;
  --muted-2: #64748b;
  --border: rgba(15, 23, 42, 0.10);
  --primary: #1d4ed8;
  --primary-strong: #1e3a8a;
  --primary-soft: rgba(29, 78, 216, 0.10);
  --warn-soft: rgba(245, 158, 11, 0.14);
  --danger-soft: rgba(239, 68, 68, 0.12);

  min-height: 100vh;
  padding: 20px;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;

  background-image:
    radial-gradient(circle at 20% 10%, rgba(29, 78, 216, 0.08), transparent 45%),
    radial-gradient(circle at 90% 15%, rgba(16, 185, 129, 0.06), transparent 45%),
    radial-gradient(circle at 15% 90%, rgba(245, 158, 11, 0.06), transparent 50%);
}

/* ---------- Loading / Error ---------- */
.loading-state,
.error-state {
  max-width: 980px;
  margin: 40px auto;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  gap: 14px;
}

.loading-text h2,
.error-state h2 {
  margin: 0 0 6px 0;
  font-size: 18px;
}

.loading-text p,
.error-state p {
  margin: 0;
  color: var(--muted);
  font-weight: 700;
}

.spinner {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(15, 23, 42, 0.12);
  border-top-color: rgba(29, 78, 216, 0.75);
  animation: spin 0.85s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- Buttons ---------- */
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}

.action-button.primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 10px 18px rgba(29, 78, 216, 0.18);
}

.action-button.primary:hover {
  background: var(--primary-strong);
  transform: translateY(-1px);
}

.action-button.secondary {
  background: #fff;
  color: var(--text);
  border-color: var(--border);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.action-button.secondary:hover {
  transform: translateY(-1px);
}

.filter-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}

.filter-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.icon-button {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.icon-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.icon-button.danger {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.22);
  color: #7f1d1d;
}

/* ---------- Hero ---------- */
.project-header {
  margin-bottom: 18px;
}

.project-hero {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(10px);
}

.hero-title-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  letter-spacing: -0.01em;
}

.hero-customer-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--muted);
  font-weight: 800;
  transition: color 0.12s ease;
}

.hero-customer-link:hover {
  color: var(--text);
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 12px;
}

.stage-badge,
.health-badge,
.metric-badge,
.deal-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  white-space: nowrap;
}

.stage-badge.stage-active {
  background: var(--warn-soft);
  border-color: rgba(217, 119, 6, 0.25);
  color: #7c2d12;
}

.health-badge.health-green {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.28);
  color: #065f46;
}

.health-badge.health-amber {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.30);
  color: #7c2d12;
}

.health-badge.health-red {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.28);
  color: #7f1d1d;
}

.metric-badge.metric-muted {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.10);
  color: var(--muted);
}

.metric-badge.metric-danger {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.26);
  color: #7f1d1d;
}

.metric-badge.metric-warn {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.28);
  color: #7c2d12;
}

.metric-badge.metric-neutral {
  background: rgba(29, 78, 216, 0.10);
  border-color: rgba(29, 78, 216, 0.22);
  color: var(--primary-strong);
}

.deal-badge {
  background: var(--primary-soft);
  border: 1px solid rgba(29, 78, 216, 0.22);
  color: var(--primary-strong);
}

/* ---------- Overview Grid (NEW) ---------- */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.overview-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.02);
  padding: 10px 12px;
}

.overview-label {
  font-size: 12px;
  font-weight: 900;
  color: var(--muted);
  margin-bottom: 6px;
}

.overview-value {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
  white-space: pre-wrap;
}

/* ---------- Layout Grid ---------- */
.main-content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 18px;
}

.main-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- Cards ---------- */
.content-card {
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
  padding: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.inline-actions {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.06);
  color: var(--muted);
  margin-left: 8px;
}

/* ---------- Forms ---------- */
.project-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 12px;
  font-weight: 900;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.form-input,
.form-textarea {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: #fff;
  color: var(--text);
}

.form-textarea {
  min-height: 70px;
  resize: vertical;
}

.muted {
  color: var(--muted);
  margin: 0;
}

/* ---------- Modules Selector (NEW) ---------- */
.modules-box {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.02);
}

.modules-top {
  display: flex;
  gap: 10px;
  align-items: center;
}

.modules-panel {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modules-list {
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  padding: 8px;
}

.module-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 800;
  color: var(--text);
}

.module-row:hover {
  background: rgba(29, 78, 216, 0.08);
}

.module-row.checked {
  background: rgba(16, 185, 129, 0.10);
  border: 1px solid rgba(16, 185, 129, 0.20);
}

.modules-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ---------- Lists ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Parent group wrapper */
.list-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.02);
  display: flex;
  gap: 10px;
  padding: 12px;
}

.list-item:hover {
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.list-item.is-done {
  opacity: 0.65;
}

.list-item-main {
  flex: 1;
  cursor: pointer;
}

.list-item-top {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  align-items: center;
}

.list-item-title {
  font-weight: 900;
  margin-bottom: 8px;
}

.list-item-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--muted);
  font-weight: 800;
}

.list-item-notes {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
  white-space: pre-wrap;
}

.list-item-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

/* ✅ Sub-tasks */
.subtask-list {
  margin-left: 18px;
  padding-left: 14px;
  border-left: 2px solid rgba(15, 23, 42, 0.10);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item.is-subtask {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(15, 23, 42, 0.10);
  padding: 10px 12px;
}

.list-item.is-subtask .list-item-title {
  font-weight: 800;
}

.list-item.is-subtask .list-item-meta {
  font-weight: 700;
}

/* ---------- Tags ---------- */
.status-tag,
.type-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  border: 1px solid var(--border);
}

.type-tag {
  background: rgba(29, 78, 216, 0.10);
  border-color: rgba(29, 78, 216, 0.22);
  color: var(--primary-strong);
}

.status-not-started {
  background: rgba(100, 116, 139, 0.10);
  color: #334155;
}

.status-in-progress {
  background: rgba(245, 158, 11, 0.14);
  color: #7c2d12;
}

.status-completed {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
}

.status-cancelled-on-hold {
  background: rgba(100, 116, 139, 0.10);
  color: #334155;
}

/* ---------- Task stats row (NEW) ---------- */
.task-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

/* ---------- Divider ---------- */
.divider-line {
  height: 1px;
  background: rgba(15, 23, 42, 0.08);
  margin: 6px 0;
}

/* ---------- Activity timeline (NEW) ---------- */
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
}

.activity-left {
  position: relative;
  display: flex;
  justify-content: center;
}

.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(29, 78, 216, 0.80);
  margin-top: 6px;
}

.activity-line {
  position: absolute;
  top: 18px;
  bottom: -12px;
  width: 2px;
  background: rgba(15, 23, 42, 0.10);
  border-radius: 999px;
}

.activity-content {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.02);
}

.activity-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.activity-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-type {
  font-weight: 900;
  color: var(--text);
}

.activity-date {
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
}

.activity-actions {
  display: flex;
  gap: 8px;
}

.activity-by {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
}

.activity-notes {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text);
  white-space: pre-wrap;
}

/* ---------- Quick flags (NEW) ---------- */
.quick-flags {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.flag-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(15, 23, 42, 0.02);
}

.flag-label {
  font-size: 12px;
  font-weight: 900;
  color: var(--muted);
}

.flag-value {
  font-size: 12px;
  font-weight: 900;
  color: var(--text);
}

.flag-value.good {
  color: #065f46;
}

.flag-value.bad {
  color: #7f1d1d;
}

/* ---------- Empty ---------- */
.empty-state {
  padding: 16px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  text-align: center;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.6);
}

/* ---------- Modal ---------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 18px;
  border: 1px solid var(--border);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
}

.modal-body {
  padding: 14px 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

/* ---------- Responsive ---------- */
@media (max-width: 980px) {
  .main-content-grid {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .subtask-list {
    margin-left: 10px;
    padding-left: 10px;
  }
}
