// script.js - Core application controller for Kumar Agencies Distributor Portal
// Namespace: window.KA

(function () {
  'use strict';

  // State Variables
  let currentUser = null;
  let activeTab = 'products';
  let cart = []; // Cart items: { productId, quantity }
  let sidebarCollapsed = false;

  // ==================== DOM ELEMENTS & HELPERS ====================
  function $(selector) { return document.querySelector(selector); }
  function $all(selector) { return document.querySelectorAll(selector); }

  function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==================== INITIALIZATION ====================
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Seed and initialize data storage
    KA.Data.initialize();

    // 2. Setup standard event listeners
    setupEventListeners();

    // 3. Check session on boot
    checkSession();
  });

  function checkSession() {
    currentUser = KA.Auth.currentUser();
    if (currentUser) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function setupEventListeners() {
    // Login Submission
    $('#login-form').addEventListener('submit', handleLogin);

    // Registration Submission
    $('#register-form').addEventListener('submit', handleRegister);

    // Auth Tab Switching
    $('#tab-signin-btn').addEventListener('click', () => switchAuthTab('signin'));
    $('#tab-register-btn').addEventListener('click', () => switchAuthTab('register'));

    // Logout Trigger
    $('#logout-btn').addEventListener('click', handleLogout);

    // Sidebar Collapse Toggle
    $('#sidebar-toggle-btn').addEventListener('click', toggleSidebar);

    // Modal Close
    $('#modal-close-btn').addEventListener('click', hideModal);
    $('#app-modal').addEventListener('click', (e) => {
      if (e.target === $('#app-modal')) hideModal();
    });
  }

  // ==================== AUTHENTICATION ACTIONS ====================
  function switchAuthTab(tab) {
    const loginForm = $('#login-form');
    const registerForm = $('#register-form');
    const signinBtn = $('#tab-signin-btn');
    const registerBtn = $('#tab-register-btn');
    const demoCreds = $('#demo-creds');

    if (tab === 'signin') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      signinBtn.classList.add('active');
      registerBtn.classList.remove('active');
      if (demoCreds) demoCreds.classList.remove('hidden');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      signinBtn.classList.remove('active');
      registerBtn.classList.add('active');
      if (demoCreds) demoCreds.classList.add('hidden');
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    const usernameInput = $('#login-username').value.trim();
    const passwordInput = $('#login-password').value;
    const errorMsgDiv = $('#login-error-msg');

    errorMsgDiv.classList.add('hidden');
    errorMsgDiv.textContent = '';

    const result = KA.Auth.login(usernameInput, passwordInput);

    if (result.success) {
      currentUser = result.user;
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      showDashboard();
    } else {
      errorMsgDiv.textContent = result.error;
      errorMsgDiv.classList.remove('hidden');
      showToast(result.error, 'error');
    }
  }

  function handleLogout() {
    KA.Auth.logout();
    currentUser = null;
    cart = [];
    showToast('Signed out successfully.', 'info');
    showLogin();
  }

  function handleRegister(e) {
    e.preventDefault();
    const name     = $('#reg-name').value.trim();
    const username = $('#reg-username').value.trim().toLowerCase();
    const password = $('#reg-password').value;
    const confirm  = $('#reg-confirm-password').value;
    const email    = $('#reg-email').value.trim();
    const phone    = $('#reg-phone').value.trim();
    const business = ($('#reg-business') || {}).value || '';

    const errorDiv = $('#register-error-msg');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    if (password !== confirm) {
      errorDiv.textContent = 'Passwords do not match.';
      errorDiv.classList.remove('hidden');
      return;
    }
    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters.';
      errorDiv.classList.remove('hidden');
      return;
    }

    const result = KA.Users.addCustomer({ username, password, name, email, phone, businessName: business.trim() });

    if (result.success) {
      showToast(`Account created! Welcome, ${name}. Please sign in.`, 'success');
      switchAuthTab('signin');
      $('#login-username').value = username;
      $('#login-password').value = '';
      $('#login-password').focus();
    } else {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove('hidden');
      showToast(result.error, 'error');
    }
  }

  function toggleSidebar() {
    const sidebar = $('#app-sidebar');
    const toggleIcon = $('#sidebar-toggle-btn i');
    
    sidebarCollapsed = !sidebarCollapsed;
    
    if (sidebarCollapsed) {
      sidebar.classList.add('collapsed');
      toggleIcon.className = 'fa-solid fa-chevron-right';
    } else {
      sidebar.classList.remove('collapsed');
      toggleIcon.className = 'fa-solid fa-chevron-left';
    }
  }

  // ==================== NAVIGATION & SHELL SWITCHER ====================
  function showLogin() {
    $('#login-view').classList.remove('hidden');
    $('#dashboard-view').classList.add('hidden');
    
    // Clear inputs
    $('#login-username').value = '';
    $('#login-password').value = '';
    $('#login-error-msg').classList.add('hidden');
  }

  function showDashboard() {
    $('#login-view').classList.add('hidden');
    $('#dashboard-view').classList.remove('hidden');

    // Load saved cart for customer
    if (currentUser.role === 'customer') {
      cart = JSON.parse(sessionStorage.getItem('ka_cart_' + currentUser.id)) || [];
    }

    // Populate Sidebar User Info
    $('#user-display-name').textContent = currentUser.name;
    const roleBadge = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    $('#user-display-role').textContent = roleBadge;

    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
    $('#user-avatar').textContent = initials;
    $('#user-avatar').className = 'avatar badge-' + currentUser.role;

    // Render navigation links dynamically
    renderSidebarNav();

    // Default to first active tab
    const availableTabs = getAvailableTabs();
    if (availableTabs.length > 0) {
      // Retain activeTab if it is valid, otherwise use first available
      const tabToActivate = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];
      switchTab(tabToActivate);
    }
  }

  function getAvailableTabs() {
    const tabs = [];
    if (currentUser.role === 'customer') {
      tabs.push('catalog', 'cart', 'my_orders');
    } else {
      // Owner/Employee checks
      if (KA.Auth.can('products.view')) tabs.push('products');
      if (KA.Auth.can('categories.view')) tabs.push('categories');
      if (KA.Auth.can('orders.view')) tabs.push('orders');
      if (KA.Auth.can('customers.view')) tabs.push('customers');
      if (KA.Auth.can('employees.view')) tabs.push('employees');
      if (KA.Auth.can('discounts.view')) tabs.push('discounts');
      if (KA.Auth.can('reports.sales') || KA.Auth.can('reports.inventory') || KA.Auth.can('reports.financial')) tabs.push('reports');
      // Payments: owner always + employees with payments.view
      if (currentUser.role === 'owner' || KA.Auth.can('payments.view')) tabs.push('payments');
      if (KA.Auth.can('settings.company') || KA.Auth.can('settings.gst')) tabs.push('settings');
      // Owners always get activity log
      if (currentUser.role === 'owner') {
        tabs.push('activity_log');
      }
    }
    return tabs;
  }

  function renderSidebarNav() {
    const navMenu = $('#sidebar-menu');
    navMenu.innerHTML = '';

    const availableTabs = getAvailableTabs();

    if (currentUser.role === 'customer') {
      navMenu.innerHTML += `<div class="nav-section-title">Wholesale Buyer</div>`;
      addNavItem(navMenu, 'catalog', 'Catalog', 'fa-solid fa-store', 'catalog');
      const cartCountText = cart.length > 0 ? ` <span class="badge badge-info avatar-sm" id="cart-badge">${cart.reduce((sum, i) => sum + i.quantity, 0)}</span>` : '';
      addNavItem(navMenu, 'cart', `Shopping Cart${cartCountText}`, 'fa-solid fa-cart-shopping', 'cart');
      addNavItem(navMenu, 'my_orders', 'My Purchase Orders', 'fa-solid fa-receipt', 'my_orders');
    } else {
      navMenu.innerHTML += `<div class="nav-section-title">Inventory &amp; Sales</div>`;
      if (availableTabs.includes('products')) {
        addNavItem(navMenu, 'products', 'Products', 'fa-solid fa-boxes-stacked', 'products');
      }
      if (availableTabs.includes('categories')) {
        addNavItem(navMenu, 'categories', 'Categories', 'fa-solid fa-tags', 'categories');
      }
      if (availableTabs.includes('orders')) {
        addNavItem(navMenu, 'orders', 'Order Hub', 'fa-solid fa-truck-ramp-box', 'orders');
      }
      if (availableTabs.includes('discounts')) {
        addNavItem(navMenu, 'discounts', 'Discounts', 'fa-solid fa-percent', 'discounts');
      }

      navMenu.innerHTML += `<div class="nav-section-title">Finance &amp; Admin</div>`;
      if (availableTabs.includes('payments')) {
        addNavItem(navMenu, 'payments', 'Payment Tracking', 'fa-solid fa-money-bill-wave', 'payments');
      }
      if (availableTabs.includes('customers')) {
        addNavItem(navMenu, 'customers', 'Customers', 'fa-solid fa-users', 'customers');
      }
      if (availableTabs.includes('employees')) {
        addNavItem(navMenu, 'employees', 'Employees', 'fa-solid fa-user-shield', 'employees');
      }
      if (availableTabs.includes('reports')) {
        addNavItem(navMenu, 'reports', 'Insights &amp; Reports', 'fa-solid fa-chart-line', 'reports');
      }
      if (availableTabs.includes('settings')) {
        addNavItem(navMenu, 'settings', 'Settings', 'fa-solid fa-gears', 'settings');
      }
      if (availableTabs.includes('activity_log')) {
        addNavItem(navMenu, 'activity_log', 'Audit Log', 'fa-solid fa-file-invoice', 'activity_log');
      }
    }
  }

  function addNavItem(container, tabId, label, iconClass, activeKey) {
    const item = document.createElement('div');
    item.className = 'nav-item' + (activeTab === activeKey ? ' active' : '');
    item.innerHTML = `
      <div class="nav-icon"><i class="${iconClass}"></i></div>
      <div class="nav-label">${label}</div>
    `;
    item.addEventListener('click', () => switchTab(tabId));
    container.appendChild(item);
  }

  function switchTab(tabId) {
    activeTab = tabId;

    // Refresh nav selection state
    renderSidebarNav();

    // Set page headers
    updateHeader();

    // Render contents
    renderActiveView();
  }

  function updateHeader() {
    const titles = {
      // Customer
      catalog:      { title: 'Browse Products',               breadcrumb: 'Customer / Catalog' },
      cart:         { title: 'Shopping Invoice Cart',          breadcrumb: 'Customer / Cart' },
      my_orders:    { title: 'My Purchase Orders',             breadcrumb: 'Customer / Orders' },
      // Admin
      products:     { title: 'Product Catalog',               breadcrumb: 'Warehouse / Products' },
      categories:   { title: 'Inventory Categories',          breadcrumb: 'Warehouse / Categories' },
      orders:       { title: 'Order Fulfillment Hub',          breadcrumb: 'Fulfillment / Orders' },
      payments:     { title: 'Payment Tracking Ledger',       breadcrumb: 'Finance / Payments' },
      customers:    { title: 'Customer Accounts',             breadcrumb: 'Management / Customers' },
      employees:    { title: 'Employee Control Panel',        breadcrumb: 'Owner / Employees' },
      discounts:    { title: 'Wholesale Discount Rules',      breadcrumb: 'Owner / Discounts' },
      reports:      { title: 'Business Performance Insights', breadcrumb: 'Insights / Reports' },
      settings:     { title: 'System Settings',               breadcrumb: 'Management / Settings' },
      activity_log: { title: 'Audited Action Log',            breadcrumb: 'Security / Audits' }
    };

    const config = titles[activeTab] || { title: 'Dashboard', breadcrumb: 'App / Home' };
    $('#view-title').textContent = config.title;
    $('#breadcrumb-text').textContent = config.breadcrumb;
    
    // Reset header action button
    const actionsContainer = $('#view-header-actions');
    actionsContainer.innerHTML = '';

    // Add view-level actions
    if (activeTab === 'products' && KA.Auth.can('products.add')) {
      actionsContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-add-product-modal">
          <i class="fa-solid fa-plus"></i> Add Product
        </button>
      `;
      $('#btn-add-product-modal').addEventListener('click', openAddProductModal);
    } else if (activeTab === 'categories' && KA.Auth.can('categories.add')) {
      actionsContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-add-category-modal">
          <i class="fa-solid fa-plus"></i> Add Category
        </button>
      `;
      $('#btn-add-category-modal').addEventListener('click', openAddCategoryModal);
    } else if (activeTab === 'employees' && KA.Auth.can('employees.add')) {
      actionsContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-add-employee-modal">
          <i class="fa-solid fa-plus"></i> Add Employee
        </button>
      `;
      $('#btn-add-employee-modal').addEventListener('click', openAddEmployeeModal);
    } else if (activeTab === 'discounts' && currentUser.role === 'owner') {
      // Only Owner can create discount rules
      actionsContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-add-discount-modal">
          <i class="fa-solid fa-plus"></i> Add Discount Rule
        </button>
      `;
      $('#btn-add-discount-modal').addEventListener('click', openAddDiscountModal);
    }
  }

  function renderActiveView() {
    const container = $('#view-content');
    container.innerHTML = '';

    switch (activeTab) {
      // Customer Portal Views
      case 'catalog':
        renderCatalogView(container);
        break;
      case 'cart':
        renderCartView(container);
        break;
      case 'my_orders':
        renderMyOrdersView(container);
        break;

      // Admin/Employee Views
      case 'products':
        renderProductsView(container);
        break;
      case 'categories':
        renderCategoriesView(container);
        break;
      case 'orders':
        renderOrdersHubView(container);
        break;
      case 'payments':
        renderPaymentsView(container);
        break;
      case 'customers':
        renderCustomersView(container);
        break;
      case 'employees':
        renderEmployeesView(container);
        break;
      case 'discounts':
        renderDiscountsView(container);
        break;
      case 'reports':
        renderReportsView(container);
        break;
      case 'settings':
        renderSettingsView(container);
        break;
      case 'activity_log':
        renderActivityLogView(container);
        break;
    }
  }

  // ==================== VIEW RENDERING: CUSTOMER VIEWS ====================

  function renderCatalogView(container) {
    const products = KA.Data.products.getAll().filter(p => p.enabled);
    const categories = KA.Data.categories.getAll().filter(c => c.enabled);

    let html = `
      <div class="flex flex-col gap-md">
        <!-- Search and Category Filters -->
        <div class="flex justify-between items-center gap-md w-full" style="flex-wrap: wrap;">
          <div class="search-bar">
            <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input type="text" id="catalog-search" placeholder="Search brands or names..." />
          </div>
          <div class="filter-bar" id="category-filter-chips">
            <button class="filter-btn active" data-category-id="all">All</button>
            ${categories.map(c => `<button class="filter-btn" data-category-id="${c.id}">${c.name}</button>`).join('')}
          </div>
        </div>

        <!-- Catalog Grid -->
        <div class="grid-4" id="catalog-grid"></div>
      </div>
    `;

    container.innerHTML = html;

    // Filter Trigger Setup
    let activeFilter = 'all';
    let searchQuery = '';

    const filterProducts = () => {
      const filtered = products.filter(p => {
        const matchesCategory = activeFilter === 'all' || p.categoryId === activeFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });

      const grid = $('#catalog-grid');
      grid.innerHTML = '';

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="empty-state w-full" style="grid-column: 1 / -1;">
            <i class="fa-solid fa-bag-shopping empty-icon"></i>
            <h3>No products found</h3>
            <p>Try refining your search terms or filter constraints.</p>
          </div>
        `;
        return;
      }

      filtered.forEach(p => {
        const cat = categories.find(c => c.id === p.categoryId) || { name: 'FMCG' };
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Generate styled initials avatar or inline colors for product mockup card
        const colorHue = (p.name.length * 15) % 360;
        const mockImg = `<div style="width:100%; height:160px; background: linear-gradient(135deg, hsl(${colorHue}, 40%, 25%), hsl(${colorHue+45}, 40%, 15%)); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.5);">
          <i class="fa-solid fa-boxes-stacked" style="font-size: 32px; opacity:0.6; margin-bottom:8px;"></i>
          <span style="font-weight:600; font-size:12px; letter-spacing:0.05em; text-transform:uppercase; opacity:0.8;">${p.brand}</span>
        </div>`;

        const stockStatus = p.stock > p.minStock 
          ? `<span class="text-success font-medium">${p.stock} ${p.unit}s available</span>`
          : p.stock > 0 
            ? `<span class="text-warning font-medium">Low Stock: ${p.stock} left</span>`
            : `<span class="text-danger font-bold">Out of stock</span>`;

        card.innerHTML = `
          ${mockImg}
          <div class="product-info flex flex-col gap-sm">
            <span class="product-category">${cat.name}</span>
            <div class="product-name truncate" title="${p.name}">${p.name}</div>
            <div class="product-price">${formatCurrency(p.sellingPrice)}</div>
            <div style="font-size: var(--font-xs);">${stockStatus}</div>
            <div class="flex items-center gap-sm mt-sm w-full">
              <input type="number" class="form-input" id="qty-${p.id}" value="1" min="1" max="${p.stock}" style="padding: 6px; text-align: center; width: 65px;" ${p.stock === 0 ? 'disabled' : ''} />
              <button class="btn btn-primary btn-sm flex-col w-full" onclick="window.KA.addToCart('${p.id}')" ${p.stock === 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-cart-plus"></i> Add
              </button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    };

    // Listeners for filters
    $all('#category-filter-chips .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        $all('#category-filter-chips .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-category-id');
        filterProducts();
      });
    });

    $('#catalog-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      filterProducts();
    });

    // Run initial filter
    filterProducts();
  }

  // Export helper globally so inline onclick works
  window.KA = window.KA || {};
  window.KA.addToCart = (productId) => {
    const qtyInput = $('#qty-' + productId);
    const quantity = parseInt(qtyInput.value, 10);
    const product = KA.Data.products.getById(productId);

    if (isNaN(quantity) || quantity <= 0) {
      showToast('Please enter a valid quantity.', 'warning');
      return;
    }

    if (quantity > product.stock) {
      showToast(`Cannot add ${quantity}. Only ${product.stock} items in stock.`, 'warning');
      return;
    }

    const existingIndex = cart.findIndex(item => item.productId === productId);
    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + quantity;
      if (newQty > product.stock) {
        showToast(`Adding this would exceed stock (${product.stock} items max).`, 'warning');
        return;
      }
      cart[existingIndex].quantity = newQty;
    } else {
      cart.push({ productId, quantity });
    }

    // Persist cart
    sessionStorage.setItem('ka_cart_' + currentUser.id, JSON.stringify(cart));
    
    // Refresh Sidebar count badge
    renderSidebarNav();
    
    showToast(`Added ${quantity} x ${product.name} to cart.`, 'success');
  };

  function renderCartView(container) {
    if (cart.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-cart-shopping empty-icon"></i>
          <h3>Your Invoice Cart is empty</h3>
          <p>Go back to the catalog to choose FMCG products for order placement.</p>
          <button class="btn btn-primary mt-md" onclick="document.querySelector('.nav-item').click()">
            <i class="fa-solid fa-store"></i> Browse Products
          </button>
        </div>
      `;
      return;
    }

    const itemsDetail = cart.map(item => {
      const p = KA.Data.products.getById(item.productId);
      return {
        product: p,
        quantity: item.quantity,
        subtotal: p.sellingPrice * item.quantity,
        gstAmount: (p.sellingPrice * item.quantity * p.gstPercent) / 100
      };
    });

    const subtotalTotal = itemsDetail.reduce((sum, item) => sum + item.subtotal, 0);
    const gstTotal = itemsDetail.reduce((sum, item) => sum + item.gstAmount, 0);
    const grandTotal = subtotalTotal + gstTotal;

    const currentSettings = KA.Data.settings.get();

    let html = `
      <div class="grid-3">
        <!-- Cart Items (Left side) -->
        <div class="card" style="grid-column: 1 / 3;">
          <div class="card-header">
            <h2>Order Item Listing</h2>
          </div>
          <div class="card-body table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: center;">GST %</th>
                  <th style="text-align: right;">Subtotal</th>
                  <th style="text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${itemsDetail.map(item => `
                  <tr>
                    <td>
                      <div class="font-medium">${item.product.name}</div>
                      <div class="text-muted" style="font-size:11px;">SKU: ${item.product.sku} | Brand: ${item.product.brand}</div>
                    </td>
                    <td style="text-align: right;">${formatCurrency(item.product.sellingPrice)}</td>
                    <td style="text-align: center;">
                      <div class="flex items-center justify-center gap-sm">
                        <button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.updateCartQty('${item.product.id}', ${item.quantity - 1})">-</button>
                        <span style="min-width: 24px; font-weight:600;">${item.quantity}</span>
                        <button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.updateCartQty('${item.product.id}', ${item.quantity + 1})">+</button>
                      </div>
                    </td>
                    <td style="text-align: center;">${item.product.gstPercent}%</td>
                    <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-icon btn-sm btn-danger" onclick="window.KA.removeFromCart('${item.product.id}')" title="Delete">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Checkout Terms & Submission (Right side) -->
        <div class="card flex flex-col gap-md">
          <div class="card-header">
            <h2>Wholesale Invoice Terms</h2>
          </div>
          <div class="card-body flex flex-col gap-md" style="flex:1;">
            <div class="form-group">
              <label class="form-label" for="po-terms">Payment Method *</label>
              <select id="po-terms" class="form-select">
                ${(() => {
                  const methods = (KA.Data.settings.get().paymentMethods) || {};
                  let opts = `<option value="Net 30">Net 30 Days (Trade Credit)</option>`;
                  opts += `<option value="Net 15">Net 15 Days (Wholesale)</option>`;
                  if (methods.upi)          opts += `<option value="UPI">Instant UPI Payment</option>`;
                  if (methods.cod)          opts += `<option value="COD">Cash on Delivery (COD)</option>`;
                  if (methods.bankTransfer) opts += `<option value="BankTransfer">Bank Transfer (NEFT / RTGS)</option>`;
                  return opts;
                })()}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="po-notes">Delivery Logistics Notes</label>
              <textarea id="po-notes" class="form-textarea" placeholder="Gate codes, delivery hours, dock number..."></textarea>
            </div>

            <div class="divider"></div>

            <div class="flex flex-col gap-sm" style="font-size: var(--font-sm);">
              <div class="flex justify-between">
                <span class="text-secondary">Subtotal (excl. GST):</span>
                <span class="font-medium">${formatCurrency(subtotalTotal)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary">GST Amount:</span>
                <span class="font-medium">${formatCurrency(gstTotal)}</span>
              </div>
              <div class="divider" style="margin:8px 0;"></div>
              <div class="flex justify-between" style="font-size: var(--font-lg);">
                <span class="font-bold">Total Invoice:</span>
                <span class="font-bold text-success">${formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary w-full btn-lg" id="btn-submit-po">
              <i class="fa-solid fa-file-invoice-dollar"></i> Submit Purchase Order
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    $('#btn-submit-po').addEventListener('click', handlePlaceOrder);
  }

  window.KA.updateCartQty = (productId, newQty) => {
    const product = KA.Data.products.getById(productId);
    if (newQty <= 0) {
      window.KA.removeFromCart(productId);
      return;
    }

    if (newQty > product.stock) {
      showToast(`Cannot set quantity to ${newQty}. Only ${product.stock} items in stock.`, 'warning');
      return;
    }

    const idx = cart.findIndex(item => item.productId === productId);
    if (idx > -1) {
      cart[idx].quantity = newQty;
      sessionStorage.setItem('ka_cart_' + currentUser.id, JSON.stringify(cart));
      renderActiveView();
      renderSidebarNav();
    }
  };

  window.KA.removeFromCart = (productId) => {
    cart = cart.filter(item => item.productId !== productId);
    sessionStorage.setItem('ka_cart_' + currentUser.id, JSON.stringify(cart));
    showToast('Item removed from cart.', 'info');
    renderActiveView();
    renderSidebarNav();
  };

  function handlePlaceOrder() {
    // 1. Verify Stock levels on submission
    for (let item of cart) {
      const p = KA.Data.products.getById(item.productId);
      if (item.quantity > p.stock) {
        showToast(`Stock levels changed! We only have ${p.stock} of ${p.name} left. Adjusting cart.`, 'danger');
        window.KA.updateCartQty(item.productId, p.stock);
        return;
      }
    }

    const netTermsVal = $('#po-terms').value;
    const deliveryNotesVal = $('#po-notes').value.trim();

    // Calculate totals
    const orderItems = cart.map(item => {
      const p = KA.Data.products.getById(item.productId);
      const subtotal = p.sellingPrice * item.quantity;
      const gst = (subtotal * p.gstPercent) / 100;
      return {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        price: p.sellingPrice,
        quantity: item.quantity,
        gstPercent: p.gstPercent,
        gstAmount: gst,
        subtotal: subtotal
      };
    });

    const itemAmt = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const taxAmt = orderItems.reduce((s, i) => s + i.gstAmount, 0);
    const totalInvoice = itemAmt + taxAmt;

    // Deduct stock in database
    orderItems.forEach(item => {
      const p = KA.Data.products.getById(item.productId);
      KA.Data.products.update(item.productId, { stock: p.stock - item.quantity });
    });

    // Create Order Object
    const newOrder = {
      id: 'ORD_' + Date.now().toString().substr(-6) + '_' + Math.floor(Math.random()*100),
      customerId: currentUser.id,
      customerName: currentUser.name,
      items: orderItems,
      netTerms: netTermsVal,
      deliveryNotes: deliveryNotesVal,
      subtotal: itemAmt,
      tax: taxAmt,
      totalAmount: totalInvoice,
      status: 'pending', // pending -> approved -> dispatched -> delivered (or cancelled)
      createdAt: new Date().toISOString()
    };

    KA.Data.orders.add(newOrder);

    // Create payment tracking record automatically
    KA.Data.payments.add({
      orderId:        newOrder.id,
      customerId:     currentUser.id,
      customerName:   currentUser.name,
      amount:         totalInvoice,
      paidAmount:     0,
      status:         'unpaid',   // unpaid | partial | paid
      method:         null,
      transactionRef: '',
      notes:          ''
    });

    // Activity logging
    KA.Data.logActivity(currentUser.id, 'ORDER_PLACED', `Placed Purchase Order ${newOrder.id} for ${formatCurrency(totalInvoice)}`);

    // Reset Cart
    cart = [];
    sessionStorage.removeItem('ka_cart_' + currentUser.id);

    showToast(`Order ${newOrder.id} submitted successfully!`, 'success');

    // Switch view
    switchTab('my_orders');
  }

  function renderMyOrdersView(container) {
    const orders = KA.Data.orders.getAll()
      .filter(o => o.customerId === currentUser.id)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-receipt empty-icon"></i>
          <h3>No purchase orders yet</h3>
          <p>Submit your first purchase order via the shopping cart.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="card">
        <div class="card-header">
          <h2>Order Logistics Tracker</h2>
        </div>
        <div class="card-body table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Date</th>
                <th>Payment Terms</th>
                <th>Items Count</th>
                <th style="text-align: right;">Grand Total</th>
                <th>Status</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
                return `
                  <tr>
                    <td class="font-bold" style="color: var(--primary-light);">${o.id}</td>
                    <td>${formatDate(o.createdAt)}</td>
                    <td>${o.netTerms}</td>
                    <td>${totalQty} items</td>
                    <td class="font-bold" style="text-align: right;">${formatCurrency(o.totalAmount)}</td>
                    <td>
                      <span class="order-status ${o.status}">${o.status.toUpperCase()}</span>
                    </td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary btn-sm" onclick="window.KA.viewOrderDetails('${o.id}')">
                        <i class="fa-solid fa-eye"></i> Details
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  window.KA.viewOrderDetails = (orderId) => {
    const o = KA.Data.orders.getById(orderId);
    if (!o) return showToast('Order details not found.', 'error');

    const bodyHTML = `
      <div class="flex flex-col gap-md" style="font-size: var(--font-sm);">
        <div class="grid-2">
          <div><strong>Order ID:</strong> <span class="text-success">${o.id}</span></div>
          <div><strong>Order Date:</strong> ${formatDate(o.createdAt)}</div>
          <div><strong>Buyer Client:</strong> ${o.customerName}</div>
          <div><strong>Invoice Status:</strong> <span class="order-status ${o.status}">${o.status.toUpperCase()}</span></div>
        </div>
        
        <div class="divider"></div>

        <div><strong>Items Details:</strong></div>
        <table class="data-table" style="font-size: var(--font-xs);">
          <thead>
            <tr>
              <th>FMCG Product</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(i => `
              <tr>
                <td>${i.name}<br/><span class="text-muted">${i.brand} | GST: ${i.gstPercent}%</span></td>
                <td style="text-align: right;">${formatCurrency(i.price)}</td>
                <td style="text-align: center;">${i.quantity}</td>
                <td style="text-align: right;">${formatCurrency(i.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="flex flex-col gap-xs mt-sm" style="align-items: flex-end;">
          <div><span class="text-secondary">Subtotal (Excl. Tax):</span> <strong>${formatCurrency(o.subtotal)}</strong></div>
          <div><span class="text-secondary">Total Tax (GST):</span> <strong>${formatCurrency(o.tax)}</strong></div>
          <div style="font-size: var(--font-md);"><span class="font-bold">Total Invoice:</span> <strong class="text-success">${formatCurrency(o.totalAmount)}</strong></div>
        </div>

        <div class="divider"></div>

        <div><strong>Delivery Logistics Instructions:</strong></div>
        <p class="text-secondary" style="background: var(--bg-elevated); padding: var(--space-sm); border-radius: var(--radius-sm); font-style: italic;">
          ${o.deliveryNotes || 'No notes specified.'}
        </p>
      </div>
    `;

    // Customer can cancel orders only if 'pending'
    let footerHTML = '';
    if (currentUser.role === 'customer' && o.status === 'pending') {
      footerHTML = `
        <button class="btn btn-danger btn-sm" onclick="window.KA.cancelOrder('${o.id}')">Cancel Purchase Order</button>
      `;
    }

    showModal(`Invoice Purchase Order: ${o.id}`, bodyHTML, footerHTML);
  };

  window.KA.cancelOrder = (orderId) => {
    const o = KA.Data.orders.getById(orderId);
    if (!o) return;

    if (o.status !== 'pending' && currentUser.role === 'customer') {
      return showToast('Can only cancel pending orders.', 'warning');
    }

    // Restore stock
    o.items.forEach(item => {
      const p = KA.Data.products.getById(item.productId);
      if (p) {
        KA.Data.products.update(item.productId, { stock: p.stock + item.quantity });
      }
    });

    KA.Data.orders.update(orderId, { status: 'cancelled' });
    KA.Data.logActivity(currentUser.id, 'ORDER_CANCELLED', `Cancelled order ${orderId} (restored stock)`);
    showToast(`Order ${orderId} has been cancelled.`, 'info');
    hideModal();
    renderActiveView();
  };

  // ==================== VIEW RENDERING: OWNER / EMPLOYEE VIEWS ====================

  function renderProductsView(container) {
    const products = KA.Data.products.getAll();
    const categories = KA.Data.categories.getAll();

    let html = `
      <div class="card">
        <div class="card-header flex justify-between items-center" style="flex-wrap: wrap; gap: var(--space-sm);">
          <h2>Product Inventory Management</h2>
          
          <div class="flex gap-sm items-center" style="flex-wrap: wrap;">
            <div class="search-bar">
              <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
              <input type="text" id="prod-search-input" placeholder="Search by name/SKU..." />
            </div>
            <select id="prod-category-select" class="form-select" style="width: 150px; padding: 6px 12px;">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="card-body table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>SKU</th>
                <th>Category</th>
                <th style="text-align: right;">MRP (₹)</th>
                <th style="text-align: right;">Price (₹)</th>
                <th style="text-align: right;">Margin</th>
                <th style="text-align: center;">Stock Levels</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="products-table-rows"></tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const filterProducts = () => {
      const search = $('#prod-search-input').value.toLowerCase();
      const category = $('#prod-category-select').value;
      const rowsContainer = $('#products-table-rows');
      rowsContainer.innerHTML = '';

      const filtered = products.filter(p => {
        const matchesCategory = category === 'all' || p.categoryId === category;
        const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        rowsContainer.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No products found.</td></tr>`;
        return;
      }

      filtered.forEach(p => {
        const cat = categories.find(c => c.id === p.categoryId) || { name: 'FMCG' };
        
        // Inline edits or full modals based on rights
        const canEdit = KA.Auth.can('products.edit');
        const canDelete = KA.Auth.can('products.delete');
        const canChangeStock = KA.Auth.can('products.changeStock');
        
        const marginPercent = ((p.sellingPrice - p.purchasePrice) / p.sellingPrice * 100).toFixed(0);

        let stockControl = `<strong>${p.stock}</strong> ${p.unit}`;
        if (canChangeStock) {
          stockControl = `
            <div class="flex items-center justify-center gap-sm">
              <button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.adjustStockInline('${p.id}', -10)" title="-10">-</button>
              <span style="font-weight:600; min-width:32px; text-align:center;">${p.stock}</span>
              <button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.adjustStockInline('${p.id}', 10)" title="+10">+</button>
            </div>
          `;
        }

        let actions = '-';
        if (canEdit || canDelete) {
          actions = `
            <div class="flex justify-center gap-sm">
              ${canEdit ? `<button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.openEditProductModal('${p.id}')" title="Edit Product"><i class="fa-solid fa-pen"></i></button>` : ''}
              ${canDelete ? `<button class="btn btn-icon btn-sm btn-danger" onclick="window.KA.handleDeleteProduct('${p.id}')" title="Delete Product"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            </div>
          `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="font-medium">${p.name}</div>
            <div class="text-muted" style="font-size:11px;">Brand: ${p.brand} | GST: ${p.gstPercent}%</div>
          </td>
          <td class="font-bold">${p.sku}</td>
          <td>${cat.name}</td>
          <td style="text-align: right;">${p.mrp.toFixed(2)}</td>
          <td style="text-align: right; color: var(--primary-light);" class="font-bold">${p.sellingPrice.toFixed(2)}</td>
          <td style="text-align: right;" class="text-success font-medium">${marginPercent}%</td>
          <td style="text-align: center;">${stockControl}</td>
          <td style="text-align: center;">
            <span class="badge ${p.enabled ? 'badge-success' : 'badge-danger'}">
              ${p.enabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </td>
          <td style="text-align: center;">${actions}</td>
        `;
        rowsContainer.appendChild(tr);
      });
    };

    $('#prod-search-input').addEventListener('input', filterProducts);
    $('#prod-category-select').addEventListener('change', filterProducts);
    filterProducts();
  }

  window.KA.adjustStockInline = (productId, amount) => {
    const p = KA.Data.products.getById(productId);
    if (!p) return;
    const newStock = Math.max(0, p.stock + amount);
    KA.Data.products.update(productId, { stock: newStock });
    
    KA.Data.logActivity(currentUser.id, 'PRODUCT_STOCK_CHANGED', `Adjusted stock for ${p.name} from ${p.stock} to ${newStock}`);
    showToast(`Stock updated for ${p.name}.`, 'success');
    renderActiveView();
  };

  window.KA.handleDeleteProduct = (productId) => {
    const p = KA.Data.products.getById(productId);
    if (!p) return;

    if (confirm(`Are you sure you want to delete product "${p.name}"?`)) {
      KA.Data.products.remove(productId);
      KA.Data.logActivity(currentUser.id, 'PRODUCT_DELETED', `Deleted product ${p.name} (${p.sku})`);
      showToast(`Product ${p.name} deleted.`, 'info');
      renderActiveView();
    }
  };

  function openAddProductModal() {
    const categories = KA.Data.categories.getAll();
    const bodyHTML = `
      <form id="modal-product-form" class="flex flex-col gap-md">
        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="new-p-name">Product Name *</label>
            <input type="text" id="new-p-name" class="form-input" required placeholder="e.g. Amul Cheese Spreads" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-brand">Brand *</label>
            <input type="text" id="new-p-brand" class="form-input" required placeholder="e.g. Amul" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="new-p-sku">SKU Code *</label>
            <input type="text" id="new-p-sku" class="form-input" required placeholder="e.g. DAI-AMUL-CS" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-category">Category *</label>
            <select id="new-p-category" class="form-select" required>
              ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="new-p-unit">Unit Type *</label>
            <input type="text" id="new-p-unit" class="form-input" required placeholder="e.g. pcs, pack, ltr, kg" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-gst">GST % *</label>
            <select id="new-p-gst" class="form-select" required>
              <option value="0">0%</option>
              <option value="5" selected>5% (Standard food)</option>
              <option value="12">12%</option>
              <option value="18">18% (Household)</option>
              <option value="28">28%</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="new-p-mrp">MRP Price (₹) *</label>
            <input type="number" step="0.01" id="new-p-mrp" class="form-input" required placeholder="0.00" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-selling">Selling Price (₹) *</label>
            <input type="number" step="0.01" id="new-p-selling" class="form-input" required placeholder="0.00" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-purchase">Purchase Price (₹) *</label>
            <input type="number" step="0.01" id="new-p-purchase" class="form-input" required placeholder="0.00" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="new-p-stock">Initial Stock *</label>
            <input type="number" id="new-p-stock" class="form-input" required placeholder="0" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="new-p-minstock">Min Stock (Reorder Alert) *</label>
            <input type="number" id="new-p-minstock" class="form-input" required placeholder="10" />
          </div>
        </div>

        <div class="checkbox-group">
          <label><input type="checkbox" id="new-p-enabled" checked /> Enable product inside catalog</label>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitNewProduct()">Save Product</button>
    `;

    showModal('Add New Wholesale Product', bodyHTML, footerHTML);
  }

  window.KA.submitNewProduct = () => {
    const form = $('#modal-product-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const sku = $('#new-p-sku').value.trim().toUpperCase();
    
    // Check duplicate SKU
    const existing = KA.Data.products.getAll().find(p => p.sku === sku);
    if (existing) {
      showToast(`A product with SKU code ${sku} already exists.`, 'warning');
      return;
    }

    const newProd = {
      name: $('#new-p-name').value.trim(),
      brand: $('#new-p-brand').value.trim(),
      sku: sku,
      categoryId: $('#new-p-category').value,
      unit: $('#new-p-unit').value.trim(),
      gstPercent: parseInt($('#new-p-gst').value, 10),
      mrp: parseFloat($('#new-p-mrp').value),
      sellingPrice: parseFloat($('#new-p-selling').value),
      purchasePrice: parseFloat($('#new-p-purchase').value),
      stock: parseInt($('#new-p-stock').value, 10),
      minStock: parseInt($('#new-p-minstock').value, 10),
      enabled: $('#new-p-enabled').checked
    };

    KA.Data.products.add(newProd);
    KA.Data.logActivity(currentUser.id, 'PRODUCT_ADDED', `Added new product ${newProd.name} (${newProd.sku})`);
    showToast(`Product ${newProd.name} added successfully.`, 'success');
    hideModal();
    renderActiveView();
  };

  window.KA.openEditProductModal = (productId) => {
    const p = KA.Data.products.getById(productId);
    if (!p) return;
    const categories = KA.Data.categories.getAll();

    const bodyHTML = `
      <form id="modal-product-form-edit" class="flex flex-col gap-md">
        <input type="hidden" id="edit-p-id" value="${p.id}" />
        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-name">Product Name *</label>
            <input type="text" id="edit-p-name" class="form-input" required value="${p.name}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-brand">Brand *</label>
            <input type="text" id="edit-p-brand" class="form-input" required value="${p.brand}" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-sku">SKU Code *</label>
            <input type="text" id="edit-p-sku" class="form-input" required value="${p.sku}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-category">Category *</label>
            <select id="edit-p-category" class="form-select" required>
              ${categories.map(c => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-unit">Unit Type *</label>
            <input type="text" id="edit-p-unit" class="form-input" required value="${p.unit}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-gst">GST % *</label>
            <select id="edit-p-gst" class="form-select" required>
              <option value="0" ${p.gstPercent === 0 ? 'selected' : ''}>0%</option>
              <option value="5" ${p.gstPercent === 5 ? 'selected' : ''}>5%</option>
              <option value="12" ${p.gstPercent === 12 ? 'selected' : ''}>12%</option>
              <option value="18" ${p.gstPercent === 18 ? 'selected' : ''}>18%</option>
              <option value="28" ${p.gstPercent === 28 ? 'selected' : ''}>28%</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-mrp">MRP Price (₹) *</label>
            <input type="number" step="0.01" id="edit-p-mrp" class="form-input" required value="${p.mrp}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-selling">Selling Price (₹) *</label>
            <input type="number" step="0.01" id="edit-p-selling" class="form-input" required value="${p.sellingPrice}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-purchase">Purchase Price (₹) *</label>
            <input type="number" step="0.01" id="edit-p-purchase" class="form-input" required value="${p.purchasePrice}" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-stock">Stock *</label>
            <input type="number" id="edit-p-stock" class="form-input" required value="${p.stock}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="edit-p-minstock">Min Stock *</label>
            <input type="number" id="edit-p-minstock" class="form-input" required value="${p.minStock}" />
          </div>
        </div>

        <div class="checkbox-group">
          <label><input type="checkbox" id="edit-p-enabled" ${p.enabled ? 'checked' : ''} /> Enable product inside catalog</label>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitEditProduct()">Save Changes</button>
    `;

    showModal(`Edit Product: ${p.sku}`, bodyHTML, footerHTML);
  };

  window.KA.submitEditProduct = () => {
    const form = $('#modal-product-form-edit');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = $('#edit-p-id').value;
    const sku = $('#edit-p-sku').value.trim().toUpperCase();

    // Check duplicate SKU in other products
    const duplicate = KA.Data.products.getAll().find(p => p.sku === sku && p.id !== id);
    if (duplicate) {
      showToast(`SKU ${sku} is already assigned to another product.`, 'warning');
      return;
    }

    const updates = {
      name: $('#edit-p-name').value.trim(),
      brand: $('#edit-p-brand').value.trim(),
      sku: sku,
      categoryId: $('#edit-p-category').value,
      unit: $('#edit-p-unit').value.trim(),
      gstPercent: parseInt($('#edit-p-gst').value, 10),
      mrp: parseFloat($('#edit-p-mrp').value),
      sellingPrice: parseFloat($('#edit-p-selling').value),
      purchasePrice: parseFloat($('#edit-p-purchase').value),
      stock: parseInt($('#edit-p-stock').value, 10),
      minStock: parseInt($('#edit-p-minstock').value, 10),
      enabled: $('#edit-p-enabled').checked
    };

    KA.Data.products.update(id, updates);
    KA.Data.logActivity(currentUser.id, 'PRODUCT_UPDATED', `Updated product details for ${updates.name} (${updates.sku})`);
    showToast(`Product ${updates.name} updated.`, 'success');
    hideModal();
    renderActiveView();
  };

  function renderCategoriesView(container) {
    const categories = KA.Data.categories.getAll();
    
    let html = `
      <div class="grid-3">
        ${categories.map(c => {
          const count = KA.Data.products.getAll().filter(p => p.categoryId === c.id).length;
          const icon = c.icon === 'coffee' ? 'fa-solid fa-mug-hot' 
                     : c.icon === 'cookie' ? 'fa-solid fa-cookie' 
                     : c.icon === 'heart' ? 'fa-solid fa-heart' 
                     : c.icon === 'droplet' ? 'fa-solid fa-droplet' 
                     : c.icon === 'home' ? 'fa-solid fa-house' 
                     : c.icon === 'wheat' ? 'fa-solid fa-wheat-awn'
                     : 'fa-solid fa-tags';

          return `
            <div class="card p-lg flex items-center justify-between">
              <div class="flex items-center gap-md">
                <div class="avatar avatar-lg" style="background: var(--gradient-primary); border:none;"><i class="${icon}"></i></div>
                <div>
                  <h3 class="font-bold" style="font-size: var(--font-lg);">${c.name}</h3>
                  <div class="text-secondary" style="font-size: var(--font-xs);">${count} products cataloged</div>
                </div>
              </div>
              
              <div class="flex gap-sm">
                ${KA.Auth.can('categories.edit') ? `<button class="btn btn-icon btn-sm btn-secondary" onclick="window.KA.openEditCategoryModal('${c.id}')"><i class="fa-solid fa-pen"></i></button>` : ''}
                ${KA.Auth.can('categories.delete') ? `<button class="btn btn-icon btn-sm btn-danger" onclick="window.KA.handleDeleteCategory('${c.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  function openAddCategoryModal() {
    const bodyHTML = `
      <form id="modal-category-form" class="flex flex-col gap-md">
        <div class="form-group">
          <label class="form-label" for="cat-id-input">Category ID (System Key) *</label>
          <input type="text" id="cat-id-input" class="form-input" required placeholder="e.g. cat_frozen" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cat-name-input">Category Display Name *</label>
          <input type="text" id="cat-name-input" class="form-input" required placeholder="e.g. Frozen Foods" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cat-icon-select">Category Icon *</label>
          <select id="cat-icon-select" class="form-select" required>
            <option value="coffee">Beverages (Hot Coffee)</option>
            <option value="cookie">Snacks (Cookie)</option>
            <option value="heart">Personal Care (Heart)</option>
            <option value="droplet">Dairy (Droplet)</option>
            <option value="home">Household (House)</option>
            <option value="wheat">Grains (Wheat)</option>
          </select>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitNewCategory()">Save Category</button>
    `;

    showModal('Add Category Layer', bodyHTML, footerHTML);
  }

  window.KA.submitNewCategory = () => {
    const form = $('#modal-category-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const rawId = $('#cat-id-input').value.trim().toLowerCase();
    const cleanId = rawId.startsWith('cat_') ? rawId : 'cat_' + rawId;

    const existing = KA.Data.categories.getById(cleanId);
    if (existing) {
      showToast(`Category ID ${cleanId} already exists.`, 'warning');
      return;
    }

    const newCat = {
      id: cleanId,
      name: $('#cat-name-input').value.trim(),
      icon: $('#cat-icon-select').value,
      enabled: true
    };

    KA.Data.categories.add(newCat);
    KA.Data.logActivity(currentUser.id, 'CATEGORY_ADDED', `Created product category ${newCat.name}`);
    showToast(`Category ${newCat.name} created.`, 'success');
    hideModal();
    renderActiveView();
  };

  window.KA.openEditCategoryModal = (id) => {
    const c = KA.Data.categories.getById(id);
    if (!c) return;

    const bodyHTML = `
      <form id="modal-category-form-edit" class="flex flex-col gap-md">
        <input type="hidden" id="edit-cat-id" value="${c.id}" />
        <div class="form-group">
          <label class="form-label">Category ID</label>
          <input type="text" class="form-input" disabled value="${c.id}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-cat-name">Category Display Name *</label>
          <input type="text" id="edit-cat-name" class="form-input" required value="${c.name}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-cat-icon">Category Icon *</label>
          <select id="edit-cat-icon" class="form-select" required>
            <option value="coffee" ${c.icon === 'coffee' ? 'selected' : ''}>Beverages (Hot Coffee)</option>
            <option value="cookie" ${c.icon === 'cookie' ? 'selected' : ''}>Snacks (Cookie)</option>
            <option value="heart" ${c.icon === 'heart' ? 'selected' : ''}>Personal Care (Heart)</option>
            <option value="droplet" ${c.icon === 'droplet' ? 'selected' : ''}>Dairy (Droplet)</option>
            <option value="home" ${c.icon === 'home' ? 'selected' : ''}>Household (House)</option>
            <option value="wheat" ${c.icon === 'wheat' ? 'selected' : ''}>Grains (Wheat)</option>
          </select>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitEditCategory()">Save Changes</button>
    `;

    showModal(`Edit Category: ${c.name}`, bodyHTML, footerHTML);
  };

  window.KA.submitEditCategory = () => {
    const form = $('#modal-category-form-edit');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = $('#edit-cat-id').value;
    const name = $('#edit-cat-name').value.trim();
    const icon = $('#edit-cat-icon').value;

    KA.Data.categories.update(id, { name, icon });
    KA.Data.logActivity(currentUser.id, 'CATEGORY_UPDATED', `Modified product category details for ${name}`);
    showToast(`Category ${name} updated.`, 'success');
    hideModal();
    renderActiveView();
  };

  window.KA.handleDeleteCategory = (id) => {
    const c = KA.Data.categories.getById(id);
    if (!c) return;

    const productsCount = KA.Data.products.getAll().filter(p => p.categoryId === id).length;
    if (productsCount > 0) {
      showToast(`Cannot delete category "${c.name}" containing ${productsCount} products. Move products first.`, 'warning');
      return;
    }

    if (confirm(`Are you sure you want to delete category "${c.name}"?`)) {
      KA.Data.categories.remove(id);
      KA.Data.logActivity(currentUser.id, 'CATEGORY_DELETED', `Deleted product category ${c.name}`);
      showToast(`Category ${c.name} deleted.`, 'info');
      renderActiveView();
    }
  };

  function renderOrdersHubView(container) {
    const orders = KA.Data.orders.getAll().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = `
      <div class="card">
        <div class="card-header flex justify-between items-center" style="flex-wrap: wrap; gap: var(--space-sm);">
          <h2>Order Fulfillment Pipeline</h2>
          
          <div class="filter-bar" id="order-status-chips">
            <button class="filter-btn active" data-status-filter="all">All Phases</button>
            <button class="filter-btn" data-status-filter="pending">Pending</button>
            <button class="filter-btn" data-status-filter="approved">Approved</button>
            <button class="filter-btn" data-status-filter="dispatched">Dispatched</button>
            <button class="filter-btn" data-status-filter="delivered">Delivered</button>
            <button class="filter-btn" data-status-filter="cancelled">Cancelled</button>
          </div>
        </div>

        <div class="card-body table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer Client</th>
                <th>Order Date</th>
                <th>Payment Terms</th>
                <th>Items Count</th>
                <th style="text-align: right;">Grand Total</th>
                <th>Fulfillment Phase</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="orders-hub-rows"></tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const filterOrders = (status) => {
      const rows = $('#orders-hub-rows');
      rows.innerHTML = '';

      const filtered = status === 'all' 
        ? orders 
        : orders.filter(o => o.status === status);

      if (filtered.length === 0) {
        rows.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No orders in this phase.</td></tr>`;
        return;
      }

      filtered.forEach(o => {
        const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
        
        let quickFulfill = '';
        const canUpdate = KA.Auth.can('orders.updateStatus');
        
        if (canUpdate) {
          if (o.status === 'pending') {
            const needsOwnerApprove = o.totalAmount > 10000;
            const canApprove = !needsOwnerApprove || KA.Auth.can('orders.approve');
            
            if (canApprove) {
              quickFulfill = `<button class="btn btn-success btn-sm" onclick="window.KA.changeOrderStatus('${o.id}', 'approved')"><i class="fa-solid fa-thumbs-up"></i> Approve</button>`;
            } else {
              quickFulfill = `<span class="badge badge-warning" style="font-size:10px;"><i class="fa-solid fa-lock"></i> Requires Owner</span>`;
            }
          } else if (o.status === 'approved') {
            quickFulfill = `<button class="btn btn-outline btn-sm" style="color:var(--primary-light); border-color:var(--primary);" onclick="window.KA.changeOrderStatus('${o.id}', 'dispatched')"><i class="fa-solid fa-truck"></i> Dispatch</button>`;
          } else if (o.status === 'dispatched') {
            quickFulfill = `<button class="btn btn-success btn-sm" onclick="window.KA.changeOrderStatus('${o.id}', 'delivered')"><i class="fa-solid fa-circle-check"></i> Deliver</button>`;
          }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-bold" style="color: var(--primary-light);">${o.id}</td>
          <td><strong>${o.customerName}</strong></td>
          <td>${formatDate(o.createdAt)}</td>
          <td>${o.netTerms}</td>
          <td>${totalQty} items</td>
          <td class="font-bold" style="text-align: right;">${formatCurrency(o.totalAmount)}</td>
          <td><span class="order-status ${o.status}">${o.status.toUpperCase()}</span></td>
          <td style="text-align: center;">
            <div class="flex justify-center items-center gap-sm">
              <button class="btn btn-secondary btn-sm" onclick="window.KA.viewHubOrderDetails('${o.id}')">Details</button>
              ${quickFulfill}
            </div>
          </td>
        `;
        rows.appendChild(tr);
      });
    };

    $all('#order-status-chips .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $all('#order-status-chips .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterOrders(btn.getAttribute('data-status-filter'));
      });
    });

    filterOrders('all');
  }

  window.KA.changeOrderStatus = (orderId, nextStatus) => {
    const o = KA.Data.orders.getById(orderId);
    if (!o) return;

    if (nextStatus === 'approved') {
      const needsOwner = o.totalAmount > 10000;
      if (needsOwner && !KA.Auth.can('orders.approve')) {
        showToast('Requires Owner permission to approve orders exceeding ₹10,000.', 'warning');
        return;
      }
    }

    KA.Data.orders.update(orderId, { status: nextStatus });
    KA.Data.logActivity(currentUser.id, 'ORDER_FULFILLED', `Transitioned order status of ${orderId} to ${nextStatus.toUpperCase()}`);
    showToast(`Order status updated to ${nextStatus.toUpperCase()}`, 'success');
    
    hideModal();
    renderActiveView();
  };

  window.KA.viewHubOrderDetails = (orderId) => {
    const o = KA.Data.orders.getById(orderId);
    if (!o) return;

    const bodyHTML = `
      <div class="flex flex-col gap-md" style="font-size: var(--font-sm);">
        <div class="grid-2">
          <div><strong>Order ID:</strong> <span class="text-success">${o.id}</span></div>
          <div><strong>Order Date:</strong> ${formatDate(o.createdAt)}</div>
          <div><strong>Buyer Client:</strong> ${o.customerName}</div>
          <div><strong>Current Phase:</strong> <span class="order-status ${o.status}">${o.status.toUpperCase()}</span></div>
        </div>
        
        <div class="divider"></div>

        <div><strong>Ordered Products Checklist:</strong></div>
        <table class="data-table" style="font-size: var(--font-xs);">
          <thead>
            <tr>
              <th>FMCG Product</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(i => `
              <tr>
                <td>${i.name}<br/><span class="text-muted">${i.brand} | SKU: ${i.sku} | GST: ${i.gstPercent}%</span></td>
                <td style="text-align: right;">${formatCurrency(i.price)}</td>
                <td style="text-align: center;">${i.quantity}</td>
                <td style="text-align: right;">${formatCurrency(i.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="flex flex-col gap-xs mt-sm" style="align-items: flex-end;">
          <div><span class="text-secondary">Subtotal (Excl. Tax):</span> <strong>${formatCurrency(o.subtotal)}</strong></div>
          <div><span class="text-secondary">GST Invoiced Tax:</span> <strong>${formatCurrency(o.tax)}</strong></div>
          <div style="font-size: var(--font-md);"><span class="font-bold">Grand Total Invoice:</span> <strong class="text-success">${formatCurrency(o.totalAmount)}</strong></div>
        </div>

        <div class="divider"></div>

        <div><strong>Buyer Logistical Notes:</strong></div>
        <p class="text-secondary" style="background: var(--bg-elevated); padding: var(--space-sm); border-radius: var(--radius-sm); font-style: italic;">
          ${o.deliveryNotes || 'None provided.'}
        </p>
      </div>
    `;

    // Render footer controls depending on status and rights
    let footerHTML = `<button class="btn btn-secondary btn-sm" onclick="hideModal()">Close</button>`;
    
    if (KA.Auth.can('orders.updateStatus')) {
      if (o.status === 'pending') {
        const needsOwner = o.totalAmount > 10000;
        const canApprove = !needsOwner || KA.Auth.can('orders.approve');
        if (canApprove) {
          footerHTML += `<button class="btn btn-success btn-sm" onclick="window.KA.changeOrderStatus('${o.id}', 'approved')"><i class="fa-solid fa-thumbs-up"></i> Approve Order</button>`;
        }
      } else if (o.status === 'approved') {
        footerHTML += `<button class="btn btn-outline btn-sm" style="color:var(--primary-light); border-color:var(--primary);" onclick="window.KA.changeOrderStatus('${o.id}', 'dispatched')"><i class="fa-solid fa-truck"></i> Dispatch Order</button>`;
      } else if (o.status === 'dispatched') {
        footerHTML += `<button class="btn btn-success btn-sm" onclick="window.KA.changeOrderStatus('${o.id}', 'delivered')"><i class="fa-solid fa-circle-check"></i> Complete Delivery</button>`;
      }

      if (o.status !== 'delivered' && o.status !== 'cancelled' && KA.Auth.can('orders.cancel')) {
        footerHTML += `<button class="btn btn-danger btn-sm" onclick="window.KA.cancelOrder('${o.id}')">Cancel & Rollback Stock</button>`;
      }
    }

    showModal(`Fulfillment Order: ${o.id}`, bodyHTML, footerHTML);
  };

  function renderCustomersView(container) {
    const customers = KA.Users.getCustomers();

    let html = `
      <div class="card">
        <div class="card-header">
          <h2>Registered Retail Buyers / Customers</h2>
        </div>
        <div class="card-body table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Username</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Access Status</th>
                <th style="text-align: center;">Controls</th>
              </tr>
            </thead>
            <tbody>
              ${customers.length === 0 
                ? `<tr><td colspan="6" class="text-center text-muted">No customers registered.</td></tr>` 
                : customers.map(c => `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td class="font-medium">${c.username}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.phone || '-'}</td>
                    <td>
                      <span class="badge ${c.enabled ? 'badge-success' : 'badge-danger'}">
                        ${c.enabled ? 'ENABLED' : 'BLOCKED'}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      ${KA.Auth.can('customers.enableDisable') 
                        ? `<button class="btn ${c.enabled ? 'btn-danger' : 'btn-success'} btn-sm" onclick="window.KA.toggleCustomerAccess('${c.id}')">
                            ${c.enabled ? '<i class="fa-solid fa-ban"></i> Suspend' : '<i class="fa-solid fa-check"></i> Activate'}
                           </button>`
                        : '-'}
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  window.KA.toggleCustomerAccess = (id) => {
    const result = KA.Users.toggleCustomer(id);
    if (result.success) {
      const updated = KA.Data.users.getById(id);
      showToast(`Customer account status changed. Account is now ${updated.enabled ? 'Active' : 'Suspended'}.`, 'info');
      renderActiveView();
    } else {
      showToast(result.error, 'error');
    }
  };

  function renderEmployeesView(container) {
    const employees = KA.Users.getEmployees();

    let html = `
      <div class="grid-3">
        ${employees.length === 0 
          ? `<div class="empty-state w-full" style="grid-column: 1 / -1;"><i class="fa-solid fa-user-shield empty-icon"></i><h3>No employee accounts</h3><p>Create employee accounts using the "Add Employee" header button.</p></div>` 
          : employees.map(e => {
            const hasManage = KA.Auth.can('employees.managePermissions');
            const initials = e.name.split(' ').map(n => n[0]).join('').toUpperCase();
            return `
              <div class="card p-lg flex flex-col gap-md">
                <div class="flex items-center gap-md">
                  <div class="avatar avatar-lg badge-employee">${initials}</div>
                  <div>
                    <h3 class="font-bold">${e.name}</h3>
                    <div class="text-secondary" style="font-size: var(--font-xs);">Username: ${e.username}</div>
                  </div>
                </div>

                <div class="flex flex-col gap-xs" style="font-size: var(--font-sm); border-top:1px solid var(--border); padding-top: var(--space-sm);">
                  <div><span class="text-secondary">Email:</span> ${e.email || '-'}</div>
                  <div><span class="text-secondary">Phone:</span> ${e.phone || '-'}</div>
                  <div><span class="text-secondary">Permissions:</span> <span class="badge badge-info">${e.permissions.length} active</span></div>
                </div>

                <div class="flex justify-between items-center mt-sm" style="border-top:1px solid var(--border); padding-top: var(--space-sm);">
                  ${hasManage ? `<button class="btn btn-outline btn-sm" onclick="window.KA.openManagePermissionsModal('${e.id}')"><i class="fa-solid fa-key"></i> Key Access</button>` : ''}
                  ${KA.Auth.can('employees.remove') ? `<button class="btn btn-icon btn-sm btn-danger" onclick="window.KA.handleDeleteEmployee('${e.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  function openAddEmployeeModal() {
    const bodyHTML = `
      <form id="modal-employee-form" class="flex flex-col gap-md">
        <div class="form-group">
          <label class="form-label" for="emp-name-input">Full Name *</label>
          <input type="text" id="emp-name-input" class="form-input" required placeholder="e.g. Suresh Patel" />
        </div>
        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="emp-user-input">Username *</label>
            <input type="text" id="emp-user-input" class="form-input" required placeholder="e.g. suresh1" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="emp-pass-input">Password *</label>
            <input type="password" id="emp-pass-input" class="form-input" required placeholder="••••••••" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="emp-email-input">Email Address</label>
            <input type="email" id="emp-email-input" class="form-input" placeholder="suresh@kumaragencies.com" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="emp-phone-input">Phone Number</label>
            <input type="text" id="emp-phone-input" class="form-input" placeholder="+91 98765 43211" />
          </div>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitNewEmployee()">Save Employee</button>
    `;

    showModal('Add Employee Account', bodyHTML, footerHTML);
  }

  window.KA.submitNewEmployee = () => {
    const form = $('#modal-employee-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      username: $('#emp-user-input').value.trim().toLowerCase(),
      password: $('#emp-pass-input').value,
      name: $('#emp-name-input').value.trim(),
      email: $('#emp-email-input').value.trim(),
      phone: $('#emp-phone-input').value.trim(),
      permissions: [
        'products.view',
        'categories.view',
        'orders.view'
      ]
    };

    const result = KA.Users.addEmployee(payload);
    if (result.success) {
      showToast(`Employee ${payload.name} created.`, 'success');
      hideModal();
      renderActiveView();
    } else {
      showToast(result.error, 'error');
    }
  };

  window.KA.handleDeleteEmployee = (id) => {
    const e = KA.Data.users.getById(id);
    if (!e) return;

    if (confirm(`Permanently remove employee account "${e.name}"?`)) {
      const result = KA.Users.removeEmployee(id);
      if (result.success) {
        showToast(`Employee ${e.name} account deleted.`, 'info');
        renderActiveView();
      } else {
        showToast(result.error, 'error');
      }
    }
  };

  window.KA.openManagePermissionsModal = (empId) => {
    const emp = KA.Data.users.getById(empId);
    if (!emp) return;

    const definitions = KA.Permissions.DEFINITIONS;

    let groupsHTML = '';
    
    // Group permissions by category
    for (const [catKey, catDef] of Object.entries(definitions)) {
      let itemsHTML = '';
      
      for (const [permKey, permLabel] of Object.entries(catDef.permissions)) {
        const isChecked = (emp.permissions || []).includes(permKey);
        
        itemsHTML += `
          <div class="permission-item">
            <span>${permLabel}</span>
            <label class="toggle-switch">
              <input type="checkbox" data-perm-key="${permKey}" ${isChecked ? 'checked' : ''} onchange="window.KA.togglePermissionValue('${emp.id}', '${permKey}', this.checked)" />
              <span class="slider"></span>
            </label>
          </div>
        `;
      }

      groupsHTML += `
        <div class="permission-group">
          <div class="permission-group-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
            <h4>${catDef.label}</h4>
            <i class="fa-solid fa-chevron-down" style="font-size:12px; opacity:0.6;"></i>
          </div>
          <div class="permission-group-body">
            ${itemsHTML}
          </div>
        </div>
      `;
    }

    const bodyHTML = `
      <div class="flex flex-col gap-sm">
        <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:var(--space-sm);">
          Set granular privileges for employee: <strong>${emp.name}</strong>.
        </div>
        ${groupsHTML}
      </div>
    `;

    const footerHTML = `
      <button class="btn btn-primary btn-sm" onclick="hideModal()">Done</button>
    `;

    showModal(`Edit Key Privileges: ${emp.name}`, bodyHTML, footerHTML);
  };

  window.KA.togglePermissionValue = (employeeId, permKey, isGranted) => {
    if (isGranted) {
      KA.Permissions.grantPermission(employeeId, permKey);
    } else {
      KA.Permissions.revokePermission(employeeId, permKey);
    }
    showToast(`Access updated.`, 'success');
  };

  function renderDiscountsView(container) {
    const discounts = KA.Data.discounts.getAll();
    const categories = KA.Data.categories.getAll();

    let html = `
      <div class="grid-3">
        ${discounts.length === 0 
          ? `<div class="empty-state w-full" style="grid-column:1/-1;"><i class="fa-solid fa-percent empty-icon"></i><h3>No active discount rules</h3><p>Generate a discount rule using the header action.</p></div>`
          : discounts.map(d => {
            const appliesToName = d.appliesTo === 'category' 
              ? (categories.find(c => c.id === d.targetId) || { name: 'Category' }).name 
              : d.appliesTo === 'product' 
                ? (KA.Data.products.getById(d.targetId) || { name: 'Product' }).name
                : 'All Catalog';

            return `
              <div class="discount-card flex flex-col gap-sm" style="border-color: ${d.enabled ? 'var(--border)' : 'rgba(239, 68, 68, 0.2)'};">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="discount-value">${d.type === 'percentage' ? d.value + '%' : formatCurrency(d.value)} OFF</div>
                    <div class="discount-label">${d.name}</div>
                  </div>
                  
                  <span class="badge ${d.approved ? 'badge-success' : 'badge-warning'}">
                    ${d.approved ? 'APPROVED' : 'PENDING APPROVAL'}
                  </span>
                </div>

                <div class="flex flex-col gap-xs mt-sm" style="font-size: var(--font-sm); border-top:1px solid var(--border); padding-top: var(--space-sm);">
                  <div><span class="text-secondary">Applies To:</span> <strong>${appliesToName}</strong></div>
                  <div><span class="text-secondary">Min Order Amt:</span> ${formatCurrency(d.minOrderAmount)}</div>
                  <div><span class="text-secondary">Validity:</span> ${d.startDate} to ${d.endDate}</div>
                </div>

                <div class="flex justify-between items-center mt-sm" style="border-top:1px solid var(--border); padding-top: var(--space-sm);">
                  <div class="flex items-center gap-xs">
                    ${KA.Auth.can('discounts.enableDisable')
                      ? `<label class="toggle-switch">
                          <input type="checkbox" ${d.enabled ? 'checked' : ''} onchange="window.KA.toggleDiscountStatus('${d.id}', this.checked)" />
                          <span class="slider"></span>
                        </label>
                        <span style="font-size: var(--font-xs);">${d.enabled ? 'Active' : 'Disabled'}</span>`
                      : `<span class="badge ${d.enabled ? 'badge-success' : 'badge-danger'}">${d.enabled ? 'ACTIVE' : 'INACTIVE'}</span>`}
                  </div>

                  <div class="flex gap-sm">
                    ${!d.approved && KA.Auth.can('discounts.approve') ? `<button class="btn btn-success btn-sm" onclick="window.KA.approveDiscountRule('${d.id}')">Approve</button>` : ''}
                    ${KA.Auth.can('discounts.enableDisable') ? `<button class="btn btn-icon btn-sm btn-danger" onclick="window.KA.handleDeleteDiscount('${d.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  window.KA.toggleDiscountStatus = (id, checked) => {
    KA.Data.discounts.update(id, { enabled: checked });
    KA.Data.logActivity(currentUser.id, 'DISCOUNT_TOGGLED', `${checked ? 'Enabled' : 'Disabled'} discount rule key ${id}`);
    showToast(`Discount rule ${checked ? 'Enabled' : 'Disabled'}.`, 'success');
    renderActiveView();
  };

  window.KA.approveDiscountRule = (id) => {
    KA.Data.discounts.update(id, { approved: true });
    KA.Data.logActivity(currentUser.id, 'DISCOUNT_APPROVED', `Approved discount rule key ${id}`);
    showToast('Discount rule approved.', 'success');
    renderActiveView();
  };

  window.KA.handleDeleteDiscount = (id) => {
    if (confirm('Permanently remove this discount rule?')) {
      KA.Data.discounts.remove(id);
      KA.Data.logActivity(currentUser.id, 'DISCOUNT_DELETED', `Deleted discount rule key ${id}`);
      showToast('Discount rule deleted.', 'info');
      renderActiveView();
    }
  };

  function openAddDiscountModal() {
    const categories = KA.Data.categories.getAll();
    const products = KA.Data.products.getAll();

    const bodyHTML = `
      <form id="modal-discount-form" class="flex flex-col gap-md">
        <div class="form-group">
          <label class="form-label" for="disc-name-input">Discount Rule Name *</label>
          <input type="text" id="disc-name-input" class="form-input" required placeholder="e.g. Diwali Snacks Mega Offer" />
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="disc-type-select">Discount Type *</label>
            <select id="disc-type-select" class="form-select" required>
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="disc-value-input">Discount Value *</label>
            <input type="number" step="0.01" id="disc-value-input" class="form-input" required placeholder="10" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="disc-appliesto-select">Applies To *</label>
            <select id="disc-appliesto-select" class="form-select" required onchange="window.KA.updateDiscountTargets(this.value)">
              <option value="all">Entire Catalog</option>
              <option value="category">Category-wide</option>
              <option value="product">Specific Product</option>
            </select>
          </div>
          <div class="form-group form-col hidden" id="disc-target-group">
            <label class="form-label" for="disc-target-select">Target Category/Product *</label>
            <select id="disc-target-select" class="form-select"></select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="disc-min-input">Min Order Amount (₹) *</label>
            <input type="number" id="disc-min-input" class="form-input" value="0" required />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="disc-max-input">Max Discount (₹) *</label>
            <input type="number" id="disc-max-input" class="form-input" value="500" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-col">
            <label class="form-label" for="disc-start-input">Start Date *</label>
            <input type="date" id="disc-start-input" class="form-input" required value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group form-col">
            <label class="form-label" for="disc-end-input">End Date *</label>
            <input type="date" id="disc-end-input" class="form-input" required />
          </div>
        </div>
      </form>
    `;

    const footerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="window.KA.submitNewDiscount()">Save Rule</button>
    `;

    showModal('Add Discount Rule', bodyHTML, footerHTML);
  }

  window.KA.updateDiscountTargets = (appliesTo) => {
    const targetGroup = $('#disc-target-group');
    const targetSelect = $('#disc-target-select');
    
    if (appliesTo === 'all') {
      targetGroup.classList.add('hidden');
      targetSelect.removeAttribute('required');
      return;
    }

    targetGroup.classList.remove('hidden');
    targetSelect.setAttribute('required', 'true');
    targetSelect.innerHTML = '';

    if (appliesTo === 'category') {
      const categories = KA.Data.categories.getAll();
      categories.forEach(c => {
        targetSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    } else if (appliesTo === 'product') {
      const products = KA.Data.products.getAll();
      products.forEach(p => {
        targetSelect.innerHTML += `<option value="${p.id}">${p.brand} - ${p.name}</option>`;
      });
    }
  };

  window.KA.submitNewDiscount = () => {
    const form = $('#modal-discount-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const appliesTo = $('#disc-appliesto-select').value;
    const targetVal = appliesTo === 'all' ? '' : $('#disc-target-select').value;

    const newRule = {
      name: $('#disc-name-input').value.trim(),
      type: $('#disc-type-select').value,
      value: parseFloat($('#disc-value-input').value),
      appliesTo: appliesTo,
      targetId: targetVal,
      minOrderAmount: parseFloat($('#disc-min-input').value),
      maxDiscount: parseFloat($('#disc-max-input').value),
      startDate: $('#disc-start-input').value,
      endDate: $('#disc-end-input').value,
      enabled: true,
      approved: currentUser.role === 'owner' // Auto-approve if created by Owner
    };

    KA.Data.discounts.add(newRule);
    KA.Data.logActivity(currentUser.id, 'DISCOUNT_CREATED', `Created discount rule: ${newRule.name}`);
    showToast(`Discount rule generated. ${newRule.approved ? 'Active' : 'Awaiting approval.'}`, 'success');
    hideModal();
    renderActiveView();
  };

  function renderReportsView(container) {
    const orders = KA.Data.orders.getAll();
    const products = KA.Data.products.getAll();
    
    // Delivered Revenue Sum
    const totalDeliveredRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((s, o) => s + o.totalAmount, 0);

    const activeOrdersCount = orders
      .filter(o => o.status === 'pending' || o.status === 'approved' || o.status === 'dispatched')
      .length;

    const lowStockCount = products
      .filter(p => p.stock <= p.minStock)
      .length;

    const totalOrdersCount = orders.length;

    // Sales by Category calculations
    const categories = KA.Data.categories.getAll();
    const categorySales = {};
    categories.forEach(c => { categorySales[c.id] = 0; });

    orders.filter(o => o.status === 'delivered').forEach(o => {
      o.items.forEach(item => {
        // Find product category
        const p = products.find(prod => prod.id === item.productId);
        if (p && categorySales[p.categoryId] !== undefined) {
          categorySales[p.categoryId] += item.subtotal;
        }
      });
    });

    const maxSales = Math.max(...Object.values(categorySales), 100);

    let html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><i class="fa-solid fa-money-bill-trend-up"></i></div>
          <div>
            <div class="stat-value" style="font-size: var(--font-2xl);">${formatCurrency(totalDeliveredRevenue)}</div>
            <div class="stat-label">Delivered Revenue</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg, #10b981, #059669);"><i class="fa-solid fa-clipboard-check"></i></div>
          <div>
            <div class="stat-value">${totalOrdersCount}</div>
            <div class="stat-label">Total Invoices</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg, #3b82f6, #2563eb);"><i class="fa-solid fa-truck-ramp-box"></i></div>
          <div>
            <div class="stat-value">${activeOrdersCount}</div>
            <div class="stat-label">Active Workloads</div>
          </div>
        </div>

        <div class="stat-card" style="border-color:${lowStockCount > 0 ? 'var(--danger)' : 'var(--border)'}">
          <div class="stat-icon" style="background:linear-gradient(135deg, #ef4444, #dc2626);"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            <div class="stat-value">${lowStockCount}</div>
            <div class="stat-label">Low Stock Alerts</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Chart 1: Sales By Category -->
        <div class="card">
          <div class="card-header">
            <h2>Revenue by Category (Delivered Orders)</h2>
          </div>
          <div class="card-body flex flex-col gap-md">
            ${categories.map(c => {
              const salesVal = categorySales[c.id] || 0;
              const barPercent = Math.min((salesVal / maxSales) * 100, 100);
              return `
                <div class="flex flex-col gap-xs">
                  <div class="flex justify-between" style="font-size: var(--font-sm);">
                    <strong>${c.name}</strong>
                    <span>${formatCurrency(salesVal)}</span>
                  </div>
                  <!-- Progress Bar Representation -->
                  <div style="width:100%; height:12px; background:rgba(255,255,255,0.05); border-radius:var(--radius-full); overflow:hidden;">
                    <div style="width:${barPercent}%; height:100%; background:var(--gradient-primary); border-radius:var(--radius-full);"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Low Stock Alerts List -->
        <div class="card flex flex-col">
          <div class="card-header">
            <h2>Warehouse Stock Warnings</h2>
          </div>
          <div class="card-body table-container" style="flex:1;">
            ${lowStockCount === 0 
              ? `<div class="empty-state"><i class="fa-solid fa-circle-check text-success" style="font-size:48px; margin-bottom:12px;"></i><h3>All Stock Levels Healthy</h3><p>No products are currently under re-order points.</p></div>`
              : `
              <table class="data-table" style="font-size: var(--font-xs);">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th style="text-align: right;">Current Stock</th>
                    <th style="text-align: right;">Alert Limit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.filter(p => p.stock <= p.minStock).map(p => `
                    <tr>
                      <td><strong>${p.name}</strong><br/><span class="text-muted">SKU: ${p.sku}</span></td>
                      <td style="text-align: right;" class="text-danger font-bold">${p.stock} ${p.unit}</td>
                      <td style="text-align: right;">${p.minStock} ${p.unit}</td>
                      <td>
                        <span class="badge badge-danger">${p.stock === 0 ? 'EMPTY' : 'CRITICAL'}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderSettingsView(container) {
    const s = KA.Data.settings.get();

    // Check permissions
    const canSave = KA.Auth.can('settings.company') || KA.Auth.can('settings.gst');

    let html = `
      <div class="card" style="max-width: 800px; margin: 0 auto;">
        <div class="card-header">
          <h2>Update Company & Billing Details</h2>
        </div>
        <div class="card-body">
          <form id="settings-form" class="flex flex-col gap-md" onsubmit="return false;">
            
            <div class="form-section">
              <h3>General Configuration</h3>
              <div class="form-row">
                <div class="form-group form-col">
                  <label class="form-label" for="set-company">Company Name</label>
                  <input type="text" id="set-company" class="form-input" value="${s.companyName}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
                <div class="form-group form-col">
                  <label class="form-label" for="set-tagline">Tagline / Motto</label>
                  <input type="text" id="set-tagline" class="form-input" value="${s.tagline}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
              </div>

              <div class="form-row mt-md">
                <div class="form-group form-col">
                  <label class="form-label" for="set-phone">Phone Number</label>
                  <input type="text" id="set-phone" class="form-input" value="${s.phone}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
                <div class="form-group form-col">
                  <label class="form-label" for="set-email">Email Address</label>
                  <input type="email" id="set-email" class="form-input" value="${s.email}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
              </div>

              <div class="form-group mt-md">
                <label class="form-label" for="set-address">Market Address</label>
                <textarea id="set-address" class="form-textarea" ${!KA.Auth.can('settings.company') ? 'disabled' : ''}>${s.address}</textarea>
              </div>
            </div>

            <div class="form-section">
              <h3>GSTIN Billing Details</h3>
              <div class="form-row">
                <div class="form-group form-col">
                  <label class="form-label" for="set-gst">GSTIN Code</label>
                  <input type="text" id="set-gst" class="form-input" value="${s.gstNumber}" ${!KA.Auth.can('settings.gst') ? 'disabled' : ''} />
                </div>
                <div class="form-group form-col">
                  <label class="form-label" for="set-currency">Currency Code</label>
                  <input type="text" id="set-currency" class="form-input" value="${s.currency}" disabled />
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Remittance Bank Account</h3>
              <div class="form-row">
                <div class="form-group form-col">
                  <label class="form-label" for="set-bank-ac">Account Number</label>
                  <input type="text" id="set-bank-ac" class="form-input" value="${s.bankAccounts[0]?.accountNo || ''}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
                <div class="form-group form-col">
                  <label class="form-label" for="set-bank-ifsc">IFSC Bank Code</label>
                  <input type="text" id="set-bank-ifsc" class="form-input" value="${s.bankAccounts[0]?.ifsc || ''}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
              </div>
              <div class="form-row mt-md">
                <div class="form-group form-col">
                  <label class="form-label" for="set-upi">UPI VPA Address</label>
                  <input type="text" id="set-upi" class="form-input" value="${s.upiIds[0]?.upiId || ''}" ${!KA.Auth.can('settings.company') ? 'disabled' : ''} />
                </div>
              </div>
            </div>

          </form>
        </div>
        ${canSave ? `
          <div class="card-footer">
            <button class="btn btn-primary btn-sm" id="btn-save-settings">
              <i class="fa-solid fa-floppy-disk"></i> Save Settings
            </button>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    if (canSave) {
      $('#btn-save-settings').addEventListener('click', handleSaveSettings);
    }
  }

  function handleSaveSettings() {
    const s = KA.Data.settings.get();

    // Reconstruct settings
    const updated = {
      companyName: $('#set-company').value.trim(),
      tagline: $('#set-tagline').value.trim(),
      gstNumber: $('#set-gst').value.trim().toUpperCase(),
      address: $('#set-address').value.trim(),
      phone: $('#set-phone').value.trim(),
      email: $('#set-email').value.trim(),
      currency: '₹',
      bankAccounts: [
        {
          id: 'bank_001',
          name: $('#set-company').value.trim(),
          accountNo: $('#set-bank-ac').value.trim(),
          ifsc: $('#set-bank-ifsc').value.trim().toUpperCase(),
          bank: 'State Bank of India'
        }
      ],
      upiIds: [
        {
          id: 'upi_001',
          name: $('#set-company').value.trim(),
          upiId: $('#set-upi').value.trim().toLowerCase()
        }
      ],
      paymentMethods: s.paymentMethods,
      logo: s.logo
    };

    KA.Data.settings.set(updated);
    KA.Data.logActivity(currentUser.id, 'SETTINGS_UPDATED', 'Modified company settings and remittance details.');
    
    // Update logo in header/sidebar if needed
    $('#sidebar-logo-text').textContent = updated.companyName;

    showToast('Company and Billing details updated.', 'success');
    renderActiveView();
  }

  function renderActivityLogView(container) {
    const logs = KA.Data.activityLog.getAll();
    const users = KA.Data.users.getAll();

    let html = `
      <div class="card">
        <div class="card-header">
          <h2>Audited System Actions</h2>
        </div>
        <div class="card-body flex flex-col gap-sm" style="max-height: 550px; overflow-y: auto;">
          ${logs.length === 0 
            ? `<div class="empty-state"><h3>Audit log is empty</h3><p>Activities will populate as transactions are completed.</p></div>` 
            : logs.map(l => {
              const u = users.find(user => user.id === l.userId) || { name: 'System Context', role: 'system' };
              
              let actionClass = 'badge-info';
              if (l.action.includes('GRANTED') || l.action.includes('ADDED') || l.action.includes('PLACED')) {
                actionClass = 'badge-success';
              } else if (l.action.includes('REVOKED') || l.action.includes('DELETED') || l.action.includes('CANCELLED')) {
                actionClass = 'badge-danger';
              } else if (l.action.includes('TOGGLED') || l.action.includes('UPDATED') || l.action.includes('CHANGED')) {
                actionClass = 'badge-warning';
              }

              return `
                <div class="activity-item">
                  <div class="activity-icon"><i class="fa-solid fa-gears"></i></div>
                  <div class="activity-text">
                    <strong>${u.name}</strong> (${u.role.toUpperCase()}) — ${l.details}
                  </div>
                  <span class="badge ${actionClass}" style="font-size:10px;">${l.action}</span>
                  <div class="activity-time">${formatDate(l.timestamp)}</div>
                </div>
              `;
            }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // ==================== REUSABLE MODAL ENGINE ====================
  function showModal(title, bodyHTML, footerHTML = '') {
    const modal = $('#app-modal');
    $('#modal-title').textContent = title;
    $('#modal-body-content').innerHTML = bodyHTML;
    
    const footer = $('#modal-footer-actions');
    if (footerHTML) {
      footer.innerHTML = footerHTML;
      footer.classList.remove('hidden');
    } else {
      footer.innerHTML = '';
      footer.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  function hideModal() {
    $('#app-modal').classList.add('hidden');
    $('#modal-body-content').innerHTML = '';
  }

  // ==================== TOAST POPUPS ENGINE ====================
  function showToast(message, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-solid fa-circle-check';
    if (type === 'error') icon = 'fa-solid fa-circle-xmark';
    else if (type === 'warning') icon = 'fa-solid fa-triangle-exclamation';
    else if (type === 'info') icon = 'fa-solid fa-circle-info';

    toast.innerHTML = `
      <i class="${icon}"></i>
      <div style="font-size: var(--font-sm);">${message}</div>
      <div class="toast-progress"></div>
    `;
    
    container.appendChild(toast);

    // Auto delete after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.4s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          container.removeChild(toast);
        }
      }, 350);
    }, 4000);
  }

})();
