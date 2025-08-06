/* CustomerDetails.css - Modern Minimalist Design */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* CSS Reset and Base Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Modern Color Palette */
  --color-primary: #2563eb;
  --color-primary-light: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-success: #10b981;
  --color-success-light: #34d399;
  --color-warning: #f59e0b;
  --color-warning-light: #fbbf24;
  --color-danger: #ef4444;
  --color-danger-light: #f87171;
  --color-info: #8b5cf6;
  --color-info-light: #a78bfa;
  
  /* Neutral Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  
  /* Transitions */
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.2s ease-in-out;
  --transition-slow: 0.3s ease-in-out;
}

body {
  font-family: var(--font-sans);
  line-height: 1.6;
  color: var(--color-gray-800);
  background-color: var(--bg-secondary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* App Container */
.app-container {
  min-height: 100vh;
  background: linear-gradient(to bottom right, var(--bg-secondary), var(--color-gray-100));
}

/* Loading States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-xl);
}

.loading-spinner.modern {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: var(--spacing-lg);
}

.spinner-ring {
  position: absolute;
  border: 2px solid transparent;
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring:nth-child(1) {
  width: 60px;
  height: 60px;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  width: 40px;
  height: 40px;
  top: 10px;
  left: 10px;
  animation-delay: 0.1s;
  border-top-color: var(--color-success);
}

.spinner-ring:nth-child(3) {
  width: 20px;
  height: 20px;
  top: 20px;
  left: 20px;
  animation-delay: 0.2s;
  border-top-color: var(--color-info);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content h3 {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-800);
  margin-bottom: var(--spacing-sm);
}

.loading-content p {
  color: var(--color-gray-500);
  font-size: 0.875rem;
}

/* Error States */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-xl);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  color: var(--color-danger);
  margin-bottom: var(--spacing-lg);
}

.error-content h2 {
  font-size: 1.875rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-800);
  margin-bottom: var(--spacing-sm);
}

.error-content p {
  color: var(--color-gray-500);
  margin-bottom: var(--spacing-xl);
  max-width: 400px;
}

.error-actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  justify-content: center;
}

/* Navigation */
.app-nav {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--color-gray-200);
  padding: var(--spacing-md) 0;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.9);
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-lg);
  color: var(--color-gray-600);
  text-decoration: none;
  transition: all var(--transition-normal);
  font-weight: var(--font-weight-medium);
  font-size: 0.875rem;
  cursor: pointer;
}

.nav-back:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-400);
  color: var(--color-gray-800);
}

.nav-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
}

.breadcrumb-item {
  color: var(--color-gray-500);
}

.breadcrumb-current {
  color: var(--color-gray-800);
  font-weight: var(--font-weight-semibold);
}

.breadcrumb-arrow {
  color: var(--color-gray-400);
  font-size: 0.75rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.customer-health {
  display: flex;
  align-items: center;
}

.health-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  min-width: 80px;
}

.health-indicator.health-green {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.health-indicator.health-blue {
  background: linear-gradient(135deg, #dbeafe, #93c5fd);
  color: #1e3a8a;
}

.health-indicator.health-yellow {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.health-indicator.health-red {
  background: linear-gradient(135deg, #fee2e2, #fca5a5);
  color: #991b1b;
}

.health-score {
  font-size: 1.125rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.health-label {
  font-size: 0.75rem;
  font-weight: var(--font-weight-medium);
  opacity: 0.8;
}

/* Main Content */
.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

/* Customer Hero Section */
.customer-hero {
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex: 1;
}

.customer-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  flex-shrink: 0;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-size: 2.5rem;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-gray-900);
  margin-bottom: var(--spacing-sm);
  line-height: 1.1;
  letter-spacing: -0.025em;
}

.customer-meta {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-gray-600);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
}

.meta-item svg {
  color: var(--color-primary);
}

.hero-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.edit-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-lg);
  color: #92400e;
  font-weight: var(--font-weight-medium);
  margin-top: var(--spacing-lg);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.metric-card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-card.primary::before {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
}

.metric-card.success::before {
  background: linear-gradient(90deg, var(--color-success), var(--color-success-light));
}

.metric-card.warning::before {
  background: linear-gradient(90deg, var(--color-warning), var(--color-warning-light));
}

.metric-card.info::before {
  background: linear-gradient(90deg, var(--color-info), var(--color-info-light));
}

.metric-card.accent::before {
  background: linear-gradient(90deg, var(--color-info), var(--color-primary));
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  flex-shrink: 0;
}

.metric-card.primary .metric-icon {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
}

.metric-card.success .metric-icon {
  background: linear-gradient(135deg, var(--color-success), var(--color-success-light));
}

.metric-card.warning .metric-icon {
  background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));
}

.metric-card.info .metric-icon {
  background: linear-gradient(135deg, var(--color-info), var(--color-info-light));
}

.metric-card.accent .metric-icon {
  background: linear-gradient(135deg, var(--color-info), var(--color-primary));
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 2.25rem;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-gray-900);
  line-height: 1;
  margin-bottom: var(--spacing-xs);
}

.metric-label {
  color: var(--color-gray-600);
  font-size: 0.875rem;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm);
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.8125rem;
  color: var(--color-gray-500);
  font-weight: var(--font-weight-medium);
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--spacing-xl);
}

.content-primary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.content-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* Card Components */
.card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--color-gray-200);
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.card-title h3 {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.card-title svg {
  color: var(--color-primary);
  font-size: 1.25rem;
}

.count-badge {
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  margin-left: var(--spacing-sm);
}

.card-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.card-content {
  padding: var(--spacing-xl);
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  border: none;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-decoration: none;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-300);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
  border-color: var(--color-gray-400);
}

.btn-ghost {
  background: transparent;
  color: var(--color-gray-600);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-gray-100);
  color: var(--color-gray-800);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.75rem;
  color: var(--color-gray-600);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
  font-size: 0.9375rem;
}

.info-input,
.info-select {
  padding: var(--spacing-md);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-normal);
  background: var(--bg-primary);
  font-family: inherit;
}

.info-input:focus,
.info-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Engagement Badge */
.engagement-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: var(--font-weight-semibold);
}

.engagement-badge.engagement-green {
  background: #d1fae5;
  color: #065f46;
}

.engagement-badge.engagement-blue {
  background: #dbeafe;
  color: #1e3a8a;
}

.engagement-badge.engagement-orange {
  background: #fed7aa;
  color: #9a3412;
}

/* Stakeholders */
.stakeholders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.stakeholder-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-normal);
  position: relative;
}

.stakeholder-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.stakeholder-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.stakeholder-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.stakeholder-actions {
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.stakeholder-card:hover .stakeholder-actions {
  opacity: 1;
}

.stakeholder-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stakeholder-name {
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
}

.stakeholder-role {
  color: var(--color-gray-600);
  font-size: 0.875rem;
  margin-bottom: var(--spacing-sm);
}

.stakeholder-contacts {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.contact-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: var(--font-weight-medium);
  transition: color var(--transition-fast);
}

.contact-link:hover {
  color: var(--color-primary-dark);
}

/* Action Buttons */
.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  font-size: 0.875rem;
}

.action-btn.edit {
  color: var(--color-warning);
}

.action-btn.edit:hover {
  background: #fef3c7;
  transform: scale(1.05);
}

.action-btn.delete {
  color: var(--color-danger);
}

.action-btn.delete:hover {
  background: #fee2e2;
  transform: scale(1.05);
}

/* Project Tabs */
.project-tabs {
  display: flex;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--color-gray-200);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-600);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-normal);
  font-size: 0.875rem;
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  background: var(--bg-primary);
}

.tab-btn:hover:not(.active) {
  color: var(--color-gray-800);
  background: var(--color-gray-100);
}

.tab-count {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
}

.tab-btn.active .tab-count {
  background: var(--color-primary);
  color: white;
}

/* Projects List */
.projects-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.project-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-normal);
  position: relative;
}

.project-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.project-main {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.project-name-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
  text-decoration: none;
  background: none;
  border: none;
  font-size: 1.125rem;
  cursor: pointer;
  transition: color var(--transition-normal);
  font-family: inherit;
}

.project-name-btn:hover {
  color: var(--color-primary);
}

.project-stage {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

/* Sales Stage Colors */
.stage-discovery { background: #dbeafe; color: #1e40af; }
.stage-demo { background: #fef3c7; color: #92400e; }
.stage-poc { background: #fed7aa; color: #ea580c; }
.stage-rfp { background: #f3e8ff; color: #7c3aed; }
.stage-contracting { background: #d1fae5; color: #065f46; }
.stage-won { background: #d1fae5; color: #065f46; }
.stage-lost { background: #fee2e2; color: #991b1b; }
.stage-cancelled { background: #f3f4f6; color: #374151; }
.stage-default { background: var(--color-gray-200); color: var(--color-gray-700); }

.project-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.project-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-success);
  font-size: 1.125rem;
}

.project-scope {
  color: var(--color-gray-600);
  font-size: 0.875rem;
  line-height: 1.5;
  font-style: italic;
}

.project-actions {
  position: absolute;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.project-card:hover .project-actions {
  opacity: 1;
}

/* Task Analytics */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.analytics-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
}

.analytics-item.completed .analytics-icon {
  background: linear-gradient(135deg, var(--color-success), var(--color-success-light));
}

.analytics-item.active .analytics-icon {
  background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));
}

.analytics-item.overdue .analytics-icon {
  background: linear-gradient(135deg, var(--color-danger), var(--color-danger-light));
}

.analytics-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  color: white;
  flex-shrink: 0;
}

.analytics-content {
  flex: 1;
}

.analytics-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
  line-height: 1;
}

.analytics-label {
  font-size: 0.75rem;
  color: var(--color-gray-600);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Progress Bar */
.progress-section {
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.progress-label {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.progress-percentage {
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.progress-bar {
  height: 8px;
  background: var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  border-radius: var(--radius-md);
  transition: width 0.5s ease;
}

.progress-detail {
  font-size: 0.8125rem;
  color: var(--color-gray-500);
  text-align: center;
}

/* Filter Toggle */
.filter-toggle {
  display: flex;
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  padding: 2px;
}

.filter-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  color: var(--color-gray-600);
}

.filter-btn.active {
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  color: var(--color-primary);
}

.filter-btn:hover:not(.active) {
  background: var(--color-gray-200);
  color: var(--color-gray-800);
}

/* Tasks List */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.task-item {
  background: var(--bg-tertiary);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  transition: all var(--transition-normal);
  position: relative;
}

.task-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.task-main {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.task-checkbox-container {
  padding-top: 2px;
  flex-shrink: 0;
}

.task-checkbox {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  accent-color: var(--color-primary);
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.task-title {
  font-size: 0.9375rem;
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
  line-height: 1.4;
  flex: 1;
}

.task-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  flex-shrink: 0;
}

.status-completed { background: #d1fae5; color: #065f46; }
.status-in-progress { background: #fef3c7; color: #92400e; }
.status-pending { background: #f3f4f6; color: #374151; }
.status-cancelled { background: #fee2e2; color: #991b1b; }

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  font-size: 0.8125rem;
  color: var(--color-gray-500);
}

.task-project {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.task-due {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
}

.task-due.today { background: #fef3c7; color: #92400e; }
.task-due.overdue { background: #fee2e2; color: #991b1b; }
.task-due.upcoming { background: #e0f2fe; color: #0277bd; }
.task-due.normal { background: var(--color-gray-100); color: var(--color-gray-600); }

.task-notes {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  color: var(--color-gray-600);
  line-height: 1.4;
}

.task-actions {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.task-item:hover .task-actions {
  opacity: 1;
}

.tasks-view-more {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-gray-500);
  font-size: 0.875rem;
}

/* Health Score Card */
.health-overview {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.health-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.health-circle.health-green {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.health-circle.health-blue {
  background: linear-gradient(135deg, #dbeafe, #93c5fd);
  color: #1e3a8a;
}

.health-circle.health-yellow {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.health-circle.health-red {
  background: linear-gradient(135deg, #fee2e2, #fca5a5);
  color: #991b1b;
}

.health-percentage {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
}

.health-details {
  flex: 1;
}

.health-status {
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
}

.health-status.status-green { color: #065f46; }
.health-status.status-blue { color: #1e3a8a; }
.health-status.status-yellow { color: #92400e; }
.health-status.status-red { color: #991b1b; }

.health-description {
  color: var(--color-gray-600);
  font-size: 0.875rem;
  line-height: 1.5;
}

.health-factors {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.factor-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.8125rem;
  color: var(--color-gray-600);
}

.factor-item svg {
  color: var(--color-primary);
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-gray-500);
}

.empty-state.compact {
  padding: var(--spacing-xl);
}

.empty-icon {
  font-size: 3rem;
  color: var(--color-gray-300);
  margin-bottom: var(--spacing-lg);
}

.empty-state.compact .empty-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
}

.empty-state h4 {
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-700);
  margin-bottom: var(--spacing-sm);
}

.empty-state.compact h4 {
  font-size: 1rem;
  margin-bottom: var(--spacing-xs);
}

.empty-state p {
  margin-bottom: var(--spacing-lg);
  color: var(--color-gray-500);
  font-size: 0.875rem;
  line-height: 1.5;
}

.empty-state.compact p {
  margin-bottom: var(--spacing-md);
  font-size: 0.8125rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-container {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
  max-width: 600px;
  border: 1px solid var(--color-gray-200);
}

.modal-container.project-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--bg-tertiary);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.modal-title h2 {
  font-size: 1.375rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.modal-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.modal-close:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-800);
}

.modal-form {
  padding: var(--spacing-xl);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.field-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
  font-size: 0.875rem;
}

.field-icon {
  color: var(--color-primary);
  font-size: 0.875rem;
}

.field-input,
.field-select,
.field-textarea {
  padding: var(--spacing-md);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-normal);
  background: var(--bg-primary);
  font-family: inherit;
}

.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.field-textarea {
  resize: vertical;
  min-height: 100px;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .content-sidebar {
    order: -1;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .app-main {
    padding: var(--spacing-md);
  }
  
  .customer-name {
    font-size: 2rem;
  }
  
  .hero-content {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-main {
    flex-direction: column;
    text-align: center;
  }
  
  .customer-meta {
    justify-content: center;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .metric-card {
    padding: var(--spacing-lg);
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .stakeholders-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }
  
  .card-actions {
    justify-content: center;
  }
  
  .project-tabs {
    flex-direction: column;
  }
  
  .tab-btn {
    border-bottom: none;
    border-left: 2px solid transparent;
  }
  
  .tab-btn.active {
    border-left-color: var(--color-primary);
    border-bottom-color: transparent;
  }
  
  .project-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .project-details {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .project-actions,
  .task-actions,
  .stakeholder-actions {
    position: static;
    opacity: 1;
    margin-top: var(--spacing-sm);
    justify-content: center;
  }
  
  .analytics-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .nav-content {
    padding: 0 var(--spacing-md);
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .nav-breadcrumb {
    order: -1;
  }
  
  .modal-overlay {
    padding: var(--spacing-md);
  }
  
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: var(--spacing-lg);
  }
  
  .modal-form {
    padding: var(--spacing-lg);
  }
}

@media (max-width: 480px) {
  .customer-name {
    font-size: 1.75rem;
  }
  
  .metric-card {
    padding: var(--spacing-md);
  }
  
  .card-content {
    padding: var(--spacing-lg);
  }
  
  .stakeholder-card,
  .project-card,
  .task-item {
    padding: var(--spacing-md);
  }
  
  .task-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .task-status {
    align-self: flex-start;
  }
  
  .modal-header {
    padding: var(--spacing-md);
  }
  
  .modal-form {
    padding: var(--spacing-md);
  }
}

/* Animation Classes */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Accessibility */
.btn:focus,
.action-btn:focus,
.tab-btn:focus,
.filter-btn:focus,
.modal-close:focus,
.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .card,
  .metric-card,
  .stakeholder-card,
  .project-card,
  .task-item {
    border: 2px solid var(--color-gray-800);
  }
  
  .btn-primary,
  .btn-secondary {
    border: 2px solid var(--color-gray-800);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .loading-spinner.modern {
    animation: none;
  }
  
  .spinner-ring {
    animation: none;
  }
}

/* Print styles */
@media print {
  .app-container {
    background: white;
  }
  
  .app-nav,
  .card-actions,
  .modal-overlay,
  .action-btn,
  .btn {
    display: none;
  }
  
  .card,
  .metric-card {
    box-shadow: none;
    border: 1px solid var(--color-gray-800);
  }
}
