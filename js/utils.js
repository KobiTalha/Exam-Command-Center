export function byId(id) {
  return document.getElementById(id);
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function percent(value, digits = 0) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function formatDate(value, options = { month: "short", day: "numeric" }) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-US", options);
}

export function sqlDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function sameDate(left, right) {
  return sqlDate(left) === sqlDate(right);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

export function formatDuration(minutes) {
  const total = Number(minutes || 0);

  if (total < 60) {
    return `${total} min`;
  }

  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function progressFromPerformance(record) {
  return Math.round((Number(record.accuracy) + (100 - Number(record.weak_score))) / 2);
}

export function getDifficultyTone(value) {
  if (Number(value) > 70) {
    return "high";
  }

  if (Number(value) >= 45) {
    return "medium";
  }

  return "low";
}

export function emptyState(message, action = "") {
  return `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
      ${action}
    </div>
  `;
}
