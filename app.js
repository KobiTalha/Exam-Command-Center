import { getJSON, postJSON } from "./js/api.js";
import {
  addDays,
  byId,
  clamp,
  sameDate,
  sqlDate,
  startOfToday,
} from "./js/utils.js";
import { renderDashboard } from "./js/views/dashboard.js";
import { renderFlashcards } from "./js/views/flashcards.js";
import { renderPlanner } from "./js/views/planner.js";
import { renderAnalytics, renderAnalyticsCharts } from "./js/views/analytics.js";
import { renderShop } from "./js/views/shop.js";

const pageTitles = {
  dashboard: "Student Dashboard",
  flashcards: "Flashcard Review",
  planner: "AI Study Planner",
  analytics: "Learning Analytics",
  shop: "Study Shop",
};

const state = {
  page: localStorage.getItem("aiub-os-page") || "dashboard",
  courses: [],
  performance: [],
  planner: {
    startDate: startOfToday(),
    selectedDate: startOfToday(),
    items: [],
  },
  flashcards: {
    courseId: localStorage.getItem("aiub-os-flashcard-course") || "all",
    queue: [],
    summaries: [],
    index: 0,
    flipped: false,
  },
  shop: {
    category: "All",
    products: [],
    cart: {
      items: [],
      count: 0,
      total: 0,
    },
    orders: [],
  },
  banner: "",
};

const refs = {};
let toastTimer;

function cacheRefs() {
  refs.pageTitle = byId("page-title");
  refs.topbarDate = byId("topbar-date");
  refs.appBanner = byId("app-banner");
  refs.cartCountBadge = byId("cart-count-badge");
  refs.dashboardMetrics = byId("dashboard-metrics");
  refs.dashboardPriorityList = byId("dashboard-priority-list");
  refs.dashboardPlanList = byId("dashboard-plan-list");
  refs.dashboardFlashcardPanel = byId("dashboard-flashcard-panel");
  refs.dashboardStoreGrid = byId("dashboard-store-grid");
  refs.flashcardCourseFilter = byId("flashcard-course-filter");
  refs.flashcardCourseLabel = byId("flashcard-course-label");
  refs.flashcardCounter = byId("flashcard-counter");
  refs.flashcardQueueStatus = byId("flashcard-queue-status");
  refs.flashcardStage = byId("flashcard-stage");
  refs.flashcardDeckList = byId("flashcard-deck-list");
  refs.plannerWindowLabel = byId("planner-window-label");
  refs.plannerDayStrip = byId("planner-day-strip");
  refs.plannerSelectedDate = byId("planner-selected-date");
  refs.plannerTaskList = byId("planner-task-list");
  refs.plannerInsights = byId("planner-insights");
  refs.analyticsMetrics = byId("analytics-metrics");
  refs.analyticsPerformanceChart = byId("analytics-performance-chart");
  refs.analyticsReviewChart = byId("analytics-review-chart");
  refs.analyticsTable = byId("analytics-table");
  refs.shopFilterPills = byId("shop-filter-pills");
  refs.shopProductGrid = byId("shop-product-grid");
  refs.cartSummaryTitle = byId("cart-summary-title");
  refs.cartPanel = byId("cart-panel");
  refs.checkoutForm = byId("checkout-form");
  refs.ordersPanel = byId("orders-panel");
  refs.toast = byId("toast");
  refs.navLinks = [...document.querySelectorAll(".nav-link[data-page]")];
  refs.pages = [...document.querySelectorAll(".page-section")];
}

function setBanner(message = "") {
  state.banner = message;

  if (message) {
    refs.appBanner.textContent = message;
    refs.appBanner.hidden = false;
  } else {
    refs.appBanner.textContent = "";
    refs.appBanner.hidden = true;
  }
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove("is-visible");
  }, 2600);
}

function syncShell() {
  refs.pageTitle.textContent = pageTitles[state.page] || pageTitles.dashboard;
  refs.topbarDate.textContent = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  refs.cartCountBadge.textContent = String(state.shop.cart.count || 0);

  refs.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.page === state.page);
  });

  refs.pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === `page-${state.page}`);
  });

  setBanner(state.banner);
}

async function loadCourses() {
  const response = await getJSON("courses.php", { action: "list" });
  state.courses = response.data;
}

async function loadPerformance() {
  const response = await getJSON("performance.php", { action: "list" });
  state.performance = response.data;
}

async function loadFlashcardSummaries() {
  const response = await getJSON("flashcards.php", { action: "summary" });
  state.flashcards.summaries = response.data;
}

async function loadFlashcardQueue(resetIndex = false) {
  const response = await getJSON("flashcards.php", {
    action: "queue",
    course_id: state.flashcards.courseId === "all" ? undefined : state.flashcards.courseId,
    limit: 30,
  });
  state.flashcards.queue = response.data;

  if (resetIndex || state.flashcards.index >= state.flashcards.queue.length) {
    state.flashcards.index = 0;
  }

  state.flashcards.flipped = false;
}

async function loadPlanner() {
  const response = await getJSON("planner.php", {
    action: "list",
    start_date: sqlDate(state.planner.startDate),
    days: 7,
  });
  state.planner.items = response.data;

  const inWindow = state.planner.items.some((item) =>
    sameDate(item.study_date, state.planner.selectedDate)
  );

  if (!inWindow) {
    state.planner.selectedDate = state.planner.startDate;
  }
}

async function loadProducts() {
  const response = await getJSON("products.php", { action: "list" });
  state.shop.products = response.data;
}

async function loadCart() {
  const response = await getJSON("cart.php", { action: "list" });
  state.shop.cart = response.data;
}

async function loadOrders() {
  const response = await getJSON("orders.php", { action: "list" });
  state.shop.orders = response.data;
}

function renderApp() {
  syncShell();
  renderDashboard(state, refs);
  renderFlashcards(state, refs);
  renderPlanner(state, refs);
  renderAnalytics(state, refs);
  renderShop(state, refs);

  if (state.page === "analytics") {
    window.requestAnimationFrame(() => renderAnalyticsCharts(state, refs));
  }
}

async function refreshAll(showMessage = false) {
  try {
    setBanner("");
    await Promise.all([
      loadCourses(),
      loadPerformance(),
      loadFlashcardSummaries(),
      loadFlashcardQueue(true),
      loadPlanner(),
      loadProducts(),
      loadCart(),
      loadOrders(),
    ]);
    renderApp();

    if (showMessage) {
      showToast("Workspace data refreshed.");
    }
  } catch (error) {
    setBanner(error.message);
    renderApp();
  }
}

function navigate(page) {
  if (!pageTitles[page]) {
    return;
  }

  state.page = page;
  localStorage.setItem("aiub-os-page", page);
  renderApp();
}

async function refreshFlashcardArea(showMessage = false) {
  try {
    await Promise.all([loadFlashcardSummaries(), loadFlashcardQueue(true), loadPerformance()]);
    renderApp();

    if (showMessage) {
      showToast("Flashcard queue updated.");
    }
  } catch (error) {
    setBanner(error.message);
  }
}

async function reviewFlashcard(difficulty) {
  const currentCard = state.flashcards.queue[state.flashcards.index];

  if (!currentCard) {
    return;
  }

  const mappedDifficulty = difficulty === "good" ? "medium" : difficulty;

  try {
    await postJSON("flashcards.php", {
      action: "review",
      id: currentCard.id,
      difficulty: mappedDifficulty,
    });

    await Promise.all([loadFlashcardSummaries(), loadFlashcardQueue(true), loadPerformance(), loadPlanner()]);
    renderApp();
    showToast(`Flashcard reviewed as ${mappedDifficulty}.`);
  } catch (error) {
    setBanner(error.message);
  }
}

async function regeneratePlanner() {
  try {
    await postJSON("planner.php", {
      action: "generate",
      start_date: sqlDate(state.planner.startDate),
      days: 7,
    });

    await Promise.all([loadPlanner(), loadPerformance()]);
    renderApp();
    showToast("Planner regenerated for the next seven days.");
  } catch (error) {
    setBanner(error.message);
  }
}

async function togglePlannerTask(id, status) {
  try {
    await postJSON("planner.php", {
      action: "toggle",
      id,
      status,
    });

    await Promise.all([loadPlanner(), loadPerformance()]);
    renderApp();
    showToast(`Planner item marked ${status}.`);
  } catch (error) {
    setBanner(error.message);
  }
}

async function addToCart(productId) {
  try {
    await postJSON("cart.php", {
      action: "add",
      product_id: productId,
      quantity: 1,
    });

    await Promise.all([loadCart()]);
    renderApp();
    showToast("Added to cart.");
  } catch (error) {
    setBanner(error.message);
  }
}

async function changeCartQuantity(id, direction) {
  const currentItem = state.shop.cart.items.find((item) => String(item.id) === String(id));

  if (!currentItem) {
    return;
  }

  const nextQuantity = Number(currentItem.quantity) + Number(direction);

  if (nextQuantity <= 0) {
    await removeCartItem(id);
    return;
  }

  if (nextQuantity > Number(currentItem.stock)) {
    showToast(`Only ${currentItem.stock} units are available.`);
    return;
  }

  try {
    await postJSON("cart.php", {
      action: "update",
      id,
      quantity: nextQuantity,
    });

    await loadCart();
    renderApp();
  } catch (error) {
    setBanner(error.message);
  }
}

async function removeCartItem(id) {
  try {
    await postJSON("cart.php", {
      action: "remove",
      id,
    });

    await loadCart();
    renderApp();
    showToast("Removed from cart.");
  } catch (error) {
    setBanner(error.message);
  }
}

async function submitCheckout(formElement) {
  const formData = new FormData(formElement);
  const payload = Object.fromEntries(formData.entries());

  try {
    await postJSON("orders.php", {
      action: "create",
      ...payload,
    });

    formElement.reset();
    await Promise.all([loadOrders(), loadCart(), loadProducts()]);
    renderApp();
    showToast("Local order placed.");
  } catch (error) {
    setBanner(error.message);
  }
}

function handleClick(event) {
  const navTarget = event.target.closest("[data-page]");
  if (navTarget) {
    navigate(navTarget.dataset.page);
    return;
  }

  const jumpTarget = event.target.closest("[data-page-jump]");
  if (jumpTarget) {
    navigate(jumpTarget.dataset.pageJump);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  switch (action) {
    case "refresh-all":
      refreshAll(true);
      break;
    case "flashcard-flip":
      state.flashcards.flipped = !state.flashcards.flipped;
      renderApp();
      break;
    case "flashcard-prev":
      state.flashcards.index = clamp(state.flashcards.index - 1, 0, Math.max(state.flashcards.queue.length - 1, 0));
      state.flashcards.flipped = false;
      renderApp();
      break;
    case "flashcard-next":
      state.flashcards.index = clamp(state.flashcards.index + 1, 0, Math.max(state.flashcards.queue.length - 1, 0));
      state.flashcards.flipped = false;
      renderApp();
      break;
    case "flashcard-refresh":
      refreshFlashcardArea(true);
      break;
    case "flashcard-review":
      reviewFlashcard(actionTarget.dataset.difficulty);
      break;
    case "flashcard-select-course":
      state.flashcards.courseId = actionTarget.dataset.courseId;
      localStorage.setItem("aiub-os-flashcard-course", state.flashcards.courseId);
      loadFlashcardQueue(true).then(renderApp).catch((error) => setBanner(error.message));
      break;
    case "planner-prev":
      state.planner.startDate = addDays(state.planner.startDate, -7);
      state.planner.selectedDate = state.planner.startDate;
      loadPlanner().then(renderApp).catch((error) => setBanner(error.message));
      break;
    case "planner-next":
      state.planner.startDate = addDays(state.planner.startDate, 7);
      state.planner.selectedDate = state.planner.startDate;
      loadPlanner().then(renderApp).catch((error) => setBanner(error.message));
      break;
    case "planner-today":
      state.planner.startDate = startOfToday();
      state.planner.selectedDate = startOfToday();
      loadPlanner().then(renderApp).catch((error) => setBanner(error.message));
      break;
    case "planner-generate":
      regeneratePlanner();
      break;
    case "planner-select-date":
      state.planner.selectedDate = new Date(actionTarget.dataset.date);
      renderApp();
      break;
    case "planner-toggle":
      togglePlannerTask(actionTarget.dataset.id, actionTarget.dataset.status);
      break;
    case "shop-filter":
      state.shop.category = actionTarget.dataset.category;
      renderApp();
      break;
    case "add-to-cart":
      addToCart(actionTarget.dataset.productId);
      break;
    case "cart-quantity":
      changeCartQuantity(actionTarget.dataset.id, Number(actionTarget.dataset.direction));
      break;
    case "cart-remove":
      removeCartItem(actionTarget.dataset.id);
      break;
    default:
      break;
  }
}

function handleChange(event) {
  if (event.target.id === "flashcard-course-filter") {
    state.flashcards.courseId = event.target.value;
    localStorage.setItem("aiub-os-flashcard-course", state.flashcards.courseId);
    loadFlashcardQueue(true).then(renderApp).catch((error) => setBanner(error.message));
  }
}

function handleSubmit(event) {
  if (event.target.id === "checkout-form") {
    event.preventDefault();
    submitCheckout(event.target);
  }
}

function handleKeyboard(event) {
  const routeMap = {
    1: "dashboard",
    2: "flashcards",
    3: "planner",
    4: "analytics",
    5: "shop",
  };

  if (routeMap[event.key]) {
    navigate(routeMap[event.key]);
  }
}

function handleResize() {
  if (!window.echarts) {
    return;
  }

  [refs.analyticsPerformanceChart, refs.analyticsReviewChart].forEach((element) => {
    const chart = window.echarts.getInstanceByDom(element);
    if (chart) {
      chart.resize();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  cacheRefs();
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", handleKeyboard);
  window.addEventListener("resize", handleResize);

  await refreshAll(false);
  navigate(state.page);
});
