import {
  average,
  emptyState,
  escapeHtml,
  formatDuration,
  progressFromPerformance,
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

export function renderAnalytics(state, refs) {
  const averageAccuracy = average(state.performance.map((item) => item.accuracy)).toFixed(1);
  const averageWeakScore = average(state.performance.map((item) => item.weak_score)).toFixed(1);
  const highRisk = state.performance.filter((item) => Number(item.weak_score) > 70).length;
  const reviewCards = state.flashcards.summaries.reduce(
    (sum, item) => sum + Number(item.due_cards || 0),
    0
  );

  refs.analyticsMetrics.innerHTML = [
    metricCard("Average Accuracy", `${averageAccuracy}%`, "Live from performance records", "accent-cyan"),
    metricCard("Average Weak Score", averageWeakScore, "Higher means more planner pressure", "accent-rose"),
    metricCard("High-Risk Courses", highRisk, "Weak score above 70", "accent-warm"),
    metricCard("Due Reviews", reviewCards, "Queue size across all decks", "accent-violet"),
  ].join("");

  refs.analyticsTable.innerHTML = state.performance.length
    ? `
      <table class="analytics-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Type</th>
            <th>Accuracy</th>
            <th>Weak Score</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${state.performance
            .map(
              (record) => `
                <tr>
                  <td>${escapeHtml(record.course_code)} · ${escapeHtml(record.course_name)}</td>
                  <td>${escapeHtml(record.course_type)}</td>
                  <td>${Number(record.accuracy).toFixed(1)}%</td>
                  <td>${Number(record.weak_score).toFixed(1)}</td>
                  <td>${progressFromPerformance(record)}%</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `
    : emptyState("Analytics will appear after performance rows are loaded.");
}

export function renderAnalyticsCharts(state, refs) {
  if (!window.echarts) {
    return;
  }

  const performanceData = [...state.performance]
    .sort((left, right) => Number(right.weak_score) - Number(left.weak_score))
    .slice(0, 10);

  const reviewData = [...state.flashcards.summaries]
    .sort((left, right) => Number(right.due_cards) - Number(left.due_cards))
    .slice(0, 8);

  const performanceChart =
    window.echarts.getInstanceByDom(refs.analyticsPerformanceChart) ||
    window.echarts.init(refs.analyticsPerformanceChart);

  performanceChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { data: ["Weak Score", "Accuracy"], textStyle: { color: "#b5bdd3" } },
    grid: { top: 48, left: 52, right: 24, bottom: 48 },
    xAxis: {
      type: "category",
      data: performanceData.map((item) => item.course_code),
      axisLabel: { color: "#7a84a1", rotate: 18 },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#7a84a1" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [
      {
        name: "Weak Score",
        type: "bar",
        data: performanceData.map((item) => Number(item.weak_score)),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: "#ff708f",
        },
      },
      {
        name: "Accuracy",
        type: "line",
        smooth: true,
        data: performanceData.map((item) => Number(item.accuracy)),
        lineStyle: { color: "#89f0ff", width: 3 },
        itemStyle: { color: "#89f0ff" },
      },
    ],
  });

  const reviewChart =
    window.echarts.getInstanceByDom(refs.analyticsReviewChart) ||
    window.echarts.init(refs.analyticsReviewChart);

  reviewChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { top: 28, left: 52, right: 24, bottom: 48 },
    xAxis: {
      type: "category",
      data: reviewData.map((item) => item.code),
      axisLabel: { color: "#7a84a1", rotate: 15 },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#7a84a1" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [
      {
        type: "bar",
        data: reviewData.map((item) => Number(item.due_cards)),
        itemStyle: {
          color: "#8c80ff",
          borderRadius: [8, 8, 0, 0],
        },
      },
    ],
  });
}
