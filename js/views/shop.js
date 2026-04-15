import { currency, emptyState, escapeHtml, formatDate } from "../utils.js";

export function renderShop(state, refs) {
  const categories = ["All", ...new Set(state.shop.products.map((product) => product.category))];
  const activeCategory = state.shop.category;
  const filteredProducts =
    activeCategory === "All"
      ? state.shop.products
      : state.shop.products.filter((product) => product.category === activeCategory);

  refs.shopFilterPills.innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter-pill ${category === activeCategory ? "is-active" : ""}"
          data-action="shop-filter"
          data-category="${escapeHtml(category)}"
        >
          <strong>${escapeHtml(category)}</strong>
          <span>${state.shop.products.filter((product) => category === "All" || product.category === category).length} items</span>
        </button>
      `
    )
    .join("");

  refs.shopProductGrid.innerHTML = filteredProducts.length
    ? filteredProducts
        .map(
          (product) => `
            <article class="product-card">
              <div class="product-visual" style="background-image: url('${escapeHtml(product.image_path || "resources/focus-bg.jpg")}')">
                ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
              </div>
              <div class="product-copy">
                <p class="eyebrow">${escapeHtml(product.category)} · ${escapeHtml(product.product_type)}</p>
                <h4>${escapeHtml(product.name)}</h4>
                <p>${escapeHtml(product.description)}</p>
              </div>
              <div class="product-footer">
                <div>
                  <div class="product-price">${currency(product.price)}</div>
                  <div class="metric-note">${Number(product.stock)} left</div>
                </div>
                <button class="primary-button compact-button" data-action="add-to-cart" data-product-id="${product.id}">
                  Add to Cart
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No products match this filter.");

  refs.cartSummaryTitle.textContent = `${state.shop.cart.count} items selected`;

  refs.cartPanel.innerHTML = state.shop.cart.items.length
    ? `
      ${state.shop.cart.items
        .map(
          (item) => `
            <article class="cart-row">
              <div class="cart-row-head">
                <div>
                  <h4>${escapeHtml(item.name)}</h4>
                  <div class="order-meta">
                    <span>${escapeHtml(item.category)}</span>
                    <span>${currency(item.price)}</span>
                  </div>
                </div>
                <strong>${currency(item.line_total)}</strong>
              </div>
              <div class="cart-row-footer">
                <div class="qty-controls">
                  <button class="qty-button" data-action="cart-quantity" data-id="${item.id}" data-direction="-1">-</button>
                  <span>${Number(item.quantity)}</span>
                  <button class="qty-button" data-action="cart-quantity" data-id="${item.id}" data-direction="1">+</button>
                </div>
                <button class="ghost-button compact-button" data-action="cart-remove" data-id="${item.id}">Remove</button>
              </div>
            </article>
          `
        )
        .join("")}
      <article class="task-card">
        <div class="task-content">
          <div class="task-head">
            <h4>Cart total</h4>
            <strong class="product-price">${currency(state.shop.cart.total)}</strong>
          </div>
          <div class="task-meta">
            <span>Local checkout only</span>
            <span>No external payment gateway</span>
          </div>
        </div>
      </article>
    `
    : emptyState("Your cart is empty. Add a study product to begin checkout.");

  refs.ordersPanel.innerHTML = state.shop.orders.length
    ? state.shop.orders
        .map(
          (order) => `
            <article class="order-row">
              <div class="order-head">
                <div>
                  <h4>Order #${order.id} · ${escapeHtml(order.customer_name)}</h4>
                  <div class="order-meta">
                    <span>${escapeHtml(order.customer_email)}</span>
                    <span>${escapeHtml(order.status)}</span>
                    <span>${escapeHtml(order.campus)}</span>
                  </div>
                </div>
                <strong class="order-total">${currency(order.total_amount)}</strong>
              </div>
              <div class="order-meta">
                <span>${Number(order.item_count)} line items</span>
                <span>${formatDate(order.order_date, { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("No orders have been placed yet.");
}
