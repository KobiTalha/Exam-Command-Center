import {
  addDays,
  emptyState,
  escapeHtml,
  formatDate,
  formatDuration,
  getDifficultyTone,
  sameDate,
  sqlDate,
} from "../utils.js";

function buildWindowDates(startDate) {
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

export function renderPlanner(state, refs) {
  const dates = buildWindowDates(state.planner.startDate);
  const selectedKey = sqlDate(state.planner.selectedDate);

  refs.plannerWindowLabel.textContent = `${formatDate(dates[0], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} → ${formatDate(dates[6], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  refs.plannerDayStrip.innerHTML = dates
    .map((date) => {
      const key = sqlDate(date);
      const items = state.planner.items.filter((item) => item.study_date === key);
      const totalMinutes = items.reduce((sum, item) => sum + Number(item.duration || 0), 0);

      return `
        <button class="day-chip ${key === selectedKey ? "is-active" : ""}" data-action="planner-select-date" data-date="${key}">
          <strong>${formatDate(date, { weekday: "short", day: "numeric" })}</strong>
          <span>${items.length} tasks</span>
          <span>${formatDuration(totalMinutes)}</span>
        </button>
      `;
    })
    .join("");

  const selectedItems = state.planner.items.filter((item) => item.study_date === selectedKey);

  refs.plannerSelectedDate.textContent = formatDate(state.planner.selectedDate, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  refs.plannerTaskList.innerHTML = selectedItems.length
    ? selectedItems
        .map(
          (item) => `
            <article class="task-card">
              <div class="task-content">
                <div class="task-head">
                  <h4>${escapeHtml(item.course_code)} · ${escapeHtml(item.topic)}</h4>
                  <span class="task-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
                </div>
                <div class="task-meta">
                  <span>${formatDuration(item.duration)}</span>
                  <span>${escapeHtml(item.course_name)}</span>
                  <span>Weak ${Number(item.weak_score || 0).toFixed(0)}</span>
                  <span>${escapeHtml(item.course_type)}</span>
                </div>
              </div>
              <div class="task-actions">
                <button
                  class="ghost-button compact-button"
                  data-action="planner-toggle"
                  data-id="${item.id}"
                  data-status="${item.status === "completed" ? "pending" : "completed"}"
                >
                  ${item.status === "completed" ? "Mark Pending" : "Mark Complete"}
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No tasks are scheduled for the selected date.");

  const topSignals = [...state.performance]
    .sort((left, right) => Number(right.weak_score) - Number(left.weak_score))
    .slice(0, 5);

  refs.plannerInsights.innerHTML = `
    <div class="task-card">
      <div class="task-content">
        <div class="task-head">
          <h4>Planner logic</h4>
          <span class="pill medium">AI weighted</span>
        </div>
        <div class="task-meta">
          <span>Core courses are boosted by default.</span>
          <span>Weak score over 70 receives more frequent study time.</span>
        </div>
      </div>
    </div>
    ${topSignals
      .map(
        (course) => `
          <article class="priority-item">
            <div class="priority-head">
              <div>
                <h4>${escapeHtml(course.course_code)} · ${escapeHtml(course.course_name)}</h4>
                <div class="priority-meta">
                  <span>${escapeHtml(course.course_type)}</span>
                  <span>Accuracy ${Number(course.accuracy).toFixed(0)}%</span>
                </div>
              </div>
              <span class="pill ${getDifficultyTone(course.weak_score)}">Weak ${Number(course.weak_score).toFixed(0)}</span>
            </div>
          </article>
        `
      )
      .join("")}
  `;
}
