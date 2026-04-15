import {
  currency,
  emptyState,
  escapeHtml,
  formatDate,
  formatDuration,
  progressFromPerformance,
  sqlDate,
} from "../utils.js";

function metricCard(label, value, note, tone) {
  return `
    <article class="metric-card ${tone}">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </article>
  `;
}

export function renderDashboard(state, refs) {
  const todayKey = sqlDate(new Date());
  const todayItems = state.planner.items.filter((item) => item.study_date === todayKey);
  const dueDecks = state.flashcards.summaries
    .filter((deck) => Number(deck.due_cards) > 0)
    .slice(0, 6);
  const featuredProducts = state.shop.products
    .filter((product) => Number(product.featured) === 1)
    .slice(0, 4);
  const weakCourses = [...state.performance]
    .sort((left, right) => Number(right.weak_score) - Number(left.weak_score))
    .slice(0, 6);

  const averageProgress = Math.round(
    state.performance.reduce((sum, record) => sum + progressFromPerformance(record), 0) /
      Math.max(state.performance.length, 1)
  );
  const dueCards = state.flashcards.summaries.reduce(
    (sum, deck) => sum + Number(deck.due_cards || 0),
    0
  );
  const weeklyMinutes = state.planner.items.reduce(
    (sum, item) => sum + Number(item.duration || 0),
    0
  );
  const openTasks = todayItems.filter((item) => item.status !== "completed").length;

  refs.dashboardMetrics.innerHTML = [
    metricCard("Courses", state.courses.length, "Exact AIUB catalog imported", "accent-cyan"),
    metricCard("Average Progress", `${averageProgress}%`, "Derived from accuracy and weak score", "accent-violet"),
    metricCard("Due Reviews", dueCards, "Spaced repetition cards due now", "accent-rose"),
    metricCard("Weekly Load", formatDuration(weeklyMinutes), `${openTasks} tasks still open today`, "accent-warm"),
  ].join("");

  refs.dashboardPriorityList.innerHTML = weakCourses.length
    ? weakCourses
        .map(
          (course) => `
            <article class="priority-item">
              <div class="priority-head">
                <div>
                  <h4>${escapeHtml(course.course_code)} · ${escapeHtml(course.course_name)}</h4>
                  <div class="priority-meta">
                    <span>${escapeHtml(course.course_type)}</span>
                    <span>${escapeHtml(course.course_difficulty)}</span>
                  </div>
                </div>
                <span class="pill ${Number(course.weak_score) > 70 ? "high" : "medium"}">
                  Weak ${Number(course.weak_score).toFixed(0)}
                </span>
              </div>
              <div class="priority-meta">
                <span>Accuracy ${Number(course.accuracy).toFixed(0)}%</span>
                <span>Progress ${progressFromPerformance(course)}%</span>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No performance data is available yet.");

  refs.dashboardPlanList.innerHTML = todayItems.length
    ? todayItems
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
                </div>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No tasks are scheduled for today. Regenerate the planner to create a study window.");

  refs.dashboardFlashcardPanel.innerHTML = dueDecks.length
    ? dueDecks
        .map(
          (deck) => `
            <article class="deck-row">
              <div class="deck-row-head">
                <div>
                  <h4>${escapeHtml(deck.code)} · ${escapeHtml(deck.name)}</h4>
                  <div class="deck-meta">
                    <span>${escapeHtml(deck.type)}</span>
                    <span>${Number(deck.total_cards)} cards</span>
                  </div>
                </div>
                <span class="pill high">${Number(deck.due_cards)} due</span>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No due flashcards right now. The queue will refill as review dates arrive.");

  refs.dashboardStoreGrid.innerHTML = featuredProducts.length
    ? featuredProducts
        .map(
          (product) => `
            <article class="product-card">
              <div class="product-visual" style="background-image: url('${escapeHtml(product.image_path || "resources/focus-bg.jpg")}')">
                ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
              </div>
              <div class="product-copy">
                <h4>${escapeHtml(product.name)}</h4>
                <p>${escapeHtml(product.description)}</p>
              </div>
              <div class="product-footer">
                <strong class="product-price">${currency(product.price)}</strong>
                <button class="ghost-button compact-button" data-page-jump="shop">Open Shop</button>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState(`No study products loaded as of ${formatDate(new Date())}.`);
}
