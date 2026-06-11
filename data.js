/**
 * ============================================================================
 * Kumar Agencies — Data Foundation Layer (data.js)
 * ============================================================================
 * Defines all data structures, seed data, and localStorage CRUD helpers.
 * This module MUST be loaded first before any other KA modules.
 *
 * Storage: localStorage (JSON-serialized arrays/objects)
 * Namespace: window.KA.Data
 * ============================================================================
 */

window.KA = window.KA || {};

KA.Data = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // STORAGE KEYS — single source of truth for all localStorage key names
  // ---------------------------------------------------------------------------
  const KEYS = {
    USERS:        'ka_users',
    PRODUCTS:     'ka_products',
    CATEGORIES:   'ka_categories',
    ORDERS:       'ka_orders',
    DISCOUNTS:    'ka_discounts',
    PAYMENTS:     'ka_payments',
    SETTINGS:     'ka_settings',
    ACTIVITY_LOG: 'ka_activity_log',
    INITIALIZED:  'ka_initialized'
  };

  // ---------------------------------------------------------------------------
  // HELPERS — ID generation & localStorage read/write
  // ---------------------------------------------------------------------------

  /**
   * Generate a unique ID string (timestamp + random suffix).
   * Not cryptographically secure — fine for client-side demo use.
   */
  function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /** Read an array from localStorage (defaults to []) */
  function getStore(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { console.error('getStore parse error for', key, e); return []; }
  }

  /** Write an array to localStorage */
  function setStore(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /** Read an object from localStorage (defaults to {}) */
  function getObject(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { console.error('getObject parse error for', key, e); return {}; }
  }

  /** Write an object to localStorage */
  function setObject(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ---------------------------------------------------------------------------
  // GENERIC CRUD — operates on array-based stores
  // ---------------------------------------------------------------------------

  /** Return all items for a given store key */
  function getAll(key) {
    return getStore(key);
  }

  /** Find a single item by its `id` field */
  function getById(key, id) {
    return getStore(key).find(function (item) { return item.id === id; });
  }

  /**
   * Add a new item to an array store.
   * Auto-generates `id` and `createdAt` if not already present.
   */
  function add(key, item) {
    var items = getStore(key);
    item.id = item.id || generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    items.push(item);
    setStore(key, items);
    return item;
  }

  /**
   * Update an existing item by merging `updates` into it.
   * Sets `updatedAt` timestamp automatically.
   * Returns the updated item or null if not found.
   */
  function update(key, id, updates) {
    var items = getStore(key);
    var idx = items.findIndex(function (i) { return i.id === id; });
    if (idx > -1) {
      items[idx] = Object.assign({}, items[idx], updates, { updatedAt: new Date().toISOString() });
      setStore(key, items);
      return items[idx];
    }
    return null;
  }

  /** Remove an item by id */
  function remove(key, id) {
    var items = getStore(key).filter(function (i) { return i.id !== id; });
    setStore(key, items);
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY LOG — capped ring-buffer style log
  // ---------------------------------------------------------------------------

  /**
   * Append an activity entry.  Newest items are at index 0.
   * The log is capped at 200 entries to avoid unbounded growth.
   */
  function logActivity(userId, action, details) {
    var log = getStore(KEYS.ACTIVITY_LOG);
    log.unshift({
      id:        generateId(),
      userId:    userId,
      action:    action,
      details:   details,
      timestamp: new Date().toISOString()
    });
    if (log.length > 200) { log.length = 200; }
    setStore(KEYS.ACTIVITY_LOG, log);
  }

  // ---------------------------------------------------------------------------
  // SEED DATA
  // ---------------------------------------------------------------------------

  // ---- Users ----------------------------------------------------------------
  var seedUsers = [
    {
      id: 'user_owner_001',
      username: 'admin',
      password: 'admin123',
      name: 'Rajesh Kumar',
      role: 'owner',
      email: 'rajesh@kumaragencies.com',
      phone: '+91 98765 43210',
      permissions: [],          // Owner always has full access by logic
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'user_emp_001',
      username: 'emp1',
      password: 'emp123',
      name: 'Suresh Patel',
      role: 'employee',
      email: 'suresh@kumaragencies.com',
      phone: '+91 98765 43211',
      permissions: [
        'products.view',
        'products.edit',
        'products.changeStock',
        'categories.view',
        'orders.view',
        'orders.updateStatus',
        'customers.view'
      ],
      enabled: true,
      createdAt: '2024-02-15T10:30:00.000Z'
    },
    {
      id: 'user_cust_001',
      username: 'cust1',
      password: 'cust123',
      name: 'Anita Sharma',
      role: 'customer',
      email: 'anita.sharma@gmail.com',
      phone: '+91 99887 76655',
      permissions: [],          // Customers have fixed permissions via logic
      enabled: true,
      createdAt: '2024-03-10T08:00:00.000Z'
    },
    {
      id: 'user_cust_002',
      username: 'cust2',
      password: 'cust123',
      name: 'Vikram Mehta',
      role: 'customer',
      email: 'vikram.mehta@yahoo.com',
      phone: '+91 88776 65544',
      permissions: [],
      enabled: true,
      createdAt: '2024-04-05T14:20:00.000Z'
    }
  ];

  // ---- Categories -----------------------------------------------------------
  var seedCategories = [
    { id: 'cat_beverages',     name: 'Beverages',       icon: 'coffee',     enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'cat_snacks',        name: 'Snacks',          icon: 'cookie',     enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'cat_personal_care', name: 'Personal Care',   icon: 'heart',      enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'cat_dairy',         name: 'Dairy',           icon: 'droplet',    enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'cat_household',     name: 'Household',       icon: 'home',       enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'cat_grains',        name: 'Grains & Pulses', icon: 'wheat',      enabled: true, createdAt: '2024-01-01T00:00:00.000Z' }
  ];

  // ---- Products (18 realistic Indian FMCG items) ----------------------------
  var seedProducts = [
    // — Beverages —
    {
      id: 'prod_001', name: 'Coca-Cola 750ml',           categoryId: 'cat_beverages',
      brand: 'Coca-Cola', sku: 'BEV-CC-750',   unit: 'pcs',
      mrp: 40,   sellingPrice: 36,  purchasePrice: 30,
      stock: 500, minStock: 50, gstPercent: 12, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_002', name: 'Thums Up 2L',               categoryId: 'cat_beverages',
      brand: 'Thums Up', sku: 'BEV-TU-2L',    unit: 'pcs',
      mrp: 90,   sellingPrice: 82,  purchasePrice: 72,
      stock: 300, minStock: 30, gstPercent: 12, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_003', name: 'Brooke Bond Red Label Tea 500g', categoryId: 'cat_beverages',
      brand: 'Brooke Bond', sku: 'BEV-BB-500', unit: 'pack',
      mrp: 270,  sellingPrice: 250, purchasePrice: 220,
      stock: 200, minStock: 25, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },

    // — Snacks —
    {
      id: 'prod_004', name: "Lay's Classic Salted 52g",   categoryId: 'cat_snacks',
      brand: "Lay's", sku: 'SNK-LAY-52',  unit: 'pcs',
      mrp: 20,   sellingPrice: 18,  purchasePrice: 14,
      stock: 800, minStock: 100, gstPercent: 12, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_005', name: 'Parle-G Gold Biscuits 1kg',  categoryId: 'cat_snacks',
      brand: 'Parle', sku: 'SNK-PG-1KG',  unit: 'pack',
      mrp: 110,  sellingPrice: 100, purchasePrice: 85,
      stock: 400, minStock: 50, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_006', name: 'Haldiram Aloo Bhujia 400g',  categoryId: 'cat_snacks',
      brand: 'Haldiram', sku: 'SNK-HAB-400', unit: 'pack',
      mrp: 150,  sellingPrice: 138, purchasePrice: 120,
      stock: 250, minStock: 30, gstPercent: 12, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },

    // — Personal Care —
    {
      id: 'prod_007', name: 'Dove Beauty Bar 100g',       categoryId: 'cat_personal_care',
      brand: 'Dove', sku: 'PC-DOVE-100',  unit: 'pcs',
      mrp: 55,   sellingPrice: 50,  purchasePrice: 42,
      stock: 600, minStock: 60, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_008', name: 'Head & Shoulders Shampoo 340ml', categoryId: 'cat_personal_care',
      brand: 'Head & Shoulders', sku: 'PC-HS-340', unit: 'pcs',
      mrp: 350,  sellingPrice: 320, purchasePrice: 280,
      stock: 180, minStock: 20, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_009', name: 'Colgate MaxFresh Toothpaste 150g', categoryId: 'cat_personal_care',
      brand: 'Colgate', sku: 'PC-COL-150', unit: 'pcs',
      mrp: 99,   sellingPrice: 90,  purchasePrice: 75,
      stock: 450, minStock: 50, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },

    // — Dairy —
    {
      id: 'prod_010', name: 'Amul Butter 500g',           categoryId: 'cat_dairy',
      brand: 'Amul', sku: 'DAI-AB-500',   unit: 'pcs',
      mrp: 270,  sellingPrice: 255, purchasePrice: 230,
      stock: 150, minStock: 20, gstPercent: 12, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_011', name: 'Mother Dairy Dahi 400g',     categoryId: 'cat_dairy',
      brand: 'Mother Dairy', sku: 'DAI-MD-400', unit: 'pcs',
      mrp: 40,   sellingPrice: 37,  purchasePrice: 32,
      stock: 200, minStock: 30, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_012', name: 'Amul Taaza Toned Milk 1L',   categoryId: 'cat_dairy',
      brand: 'Amul', sku: 'DAI-AT-1L',    unit: 'ltr',
      mrp: 58,   sellingPrice: 54,  purchasePrice: 48,
      stock: 350, minStock: 40, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },

    // — Household —
    {
      id: 'prod_013', name: 'Surf Excel Easy Wash 1.5kg', categoryId: 'cat_household',
      brand: 'Surf Excel', sku: 'HH-SE-1500', unit: 'pack',
      mrp: 230,  sellingPrice: 210, purchasePrice: 185,
      stock: 280, minStock: 30, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_014', name: 'Vim Dishwash Gel 750ml',     categoryId: 'cat_household',
      brand: 'Vim', sku: 'HH-VIM-750',   unit: 'pcs',
      mrp: 140,  sellingPrice: 128, purchasePrice: 110,
      stock: 320, minStock: 35, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_015', name: 'Harpic Power Plus 1L',       categoryId: 'cat_household',
      brand: 'Harpic', sku: 'HH-HP-1L',    unit: 'pcs',
      mrp: 175,  sellingPrice: 160, purchasePrice: 140,
      stock: 200, minStock: 25, gstPercent: 18, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },

    // — Grains & Pulses —
    {
      id: 'prod_016', name: 'Tata Sampann Toor Dal 1kg',  categoryId: 'cat_grains',
      brand: 'Tata Sampann', sku: 'GP-TD-1KG', unit: 'kg',
      mrp: 180,  sellingPrice: 165, purchasePrice: 145,
      stock: 350, minStock: 40, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_017', name: 'Fortune Basmati Rice 5kg',   categoryId: 'cat_grains',
      brand: 'Fortune', sku: 'GP-FR-5KG',  unit: 'kg',
      mrp: 450,  sellingPrice: 420, purchasePrice: 380,
      stock: 200, minStock: 25, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    },
    {
      id: 'prod_018', name: 'Aashirvaad Atta 10kg',       categoryId: 'cat_grains',
      brand: 'Aashirvaad', sku: 'GP-AA-10KG', unit: 'kg',
      mrp: 480,  sellingPrice: 450, purchasePrice: 400,
      stock: 180, minStock: 20, gstPercent: 5, enabled: true,
      createdAt: '2024-01-15T00:00:00.000Z'
    }
  ];

  // ---- Discounts (sample seed) ----------------------------------------------
  var seedDiscounts = [
    {
      id: 'disc_001',
      name: 'Summer Beverage Sale',
      type: 'percentage',          // 'percentage' | 'flat'
      value: 10,                    // 10% off
      appliesTo: 'category',       // 'category' | 'product' | 'all'
      targetId: 'cat_beverages',
      minOrderAmount: 500,
      maxDiscount: 200,
      startDate: '2024-04-01',
      endDate: '2024-06-30',
      enabled: true,
      approved: true,
      createdAt: '2024-03-25T10:00:00.000Z'
    },
    {
      id: 'disc_002',
      name: 'Bulk Grains Discount',
      type: 'flat',
      value: 50,                    // ₹50 off
      appliesTo: 'category',
      targetId: 'cat_grains',
      minOrderAmount: 1000,
      maxDiscount: 50,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      enabled: true,
      approved: true,
      createdAt: '2024-01-10T12:00:00.000Z'
    }
  ];

  // ---- Company Settings -----------------------------------------------------
  var seedSettings = {
    companyName: 'Kumar Agencies',
    tagline: 'Your Trusted FMCG Partner',
    gstNumber: '29ABCDE1234F1Z5',
    address: '123 Market Road, Chickpet, Bangalore - 560053',
    phone: '+91 98765 43210',
    email: 'info@kumaragencies.com',
    currency: '₹',
    bankAccounts: [
      {
        id: 'bank_001',
        name: 'Kumar Agencies',
        accountNo: '1234567890',
        ifsc: 'SBIN0001234',
        bank: 'State Bank of India'
      }
    ],
    upiIds: [
      {
        id: 'upi_001',
        name: 'Kumar Agencies',
        upiId: 'kumaragencies@upi'
      }
    ],
    paymentMethods: {
      upi: true,
      cod: true,
      bankTransfer: true,
      credit: false
    },
    logo: ''
  };

  // ---------------------------------------------------------------------------
  // INITIALIZATION — seeds data on very first load
  // ---------------------------------------------------------------------------

  /**
   * Populate localStorage with seed data if this is the first run.
   * Subsequent calls are a no-op (guarded by INITIALIZED flag).
   */
  function initialize() {
    if (localStorage.getItem(KEYS.INITIALIZED)) {
      return; // already seeded
    }

    setStore(KEYS.USERS, seedUsers);
    setStore(KEYS.CATEGORIES, seedCategories);
    setStore(KEYS.PRODUCTS, seedProducts);
    setStore(KEYS.DISCOUNTS, seedDiscounts);
    setStore(KEYS.ORDERS, []);               // start empty
    setStore(KEYS.PAYMENTS, []);             // start empty
    setStore(KEYS.ACTIVITY_LOG, []);         // start empty
    setObject(KEYS.SETTINGS, seedSettings);

    localStorage.setItem(KEYS.INITIALIZED, 'true');

    console.log('[KA.Data] Seed data initialized successfully.');
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  return {
    // Constants
    KEYS: KEYS,

    // Low-level helpers
    generateId: generateId,
    getStore: getStore,
    setStore: setStore,
    getObject: getObject,
    setObject: setObject,

    // Generic CRUD
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,

    // Activity log
    logActivity: logActivity,

    // Initialization
    initialize: initialize,

    // ----- Convenience domain methods -----

    users: {
      getAll:       function ()          { return getAll(KEYS.USERS); },
      getById:      function (id)        { return getById(KEYS.USERS, id); },
      add:          function (u)         { return add(KEYS.USERS, u); },
      update:       function (id, u)     { return update(KEYS.USERS, id, u); },
      remove:       function (id)        { return remove(KEYS.USERS, id); },
      getByUsername: function (username)  { return getAll(KEYS.USERS).find(function (u) { return u.username === username; }); }
    },

    products: {
      getAll:  function ()          { return getAll(KEYS.PRODUCTS); },
      getById: function (id)        { return getById(KEYS.PRODUCTS, id); },
      add:     function (p)         { return add(KEYS.PRODUCTS, p); },
      update:  function (id, p)     { return update(KEYS.PRODUCTS, id, p); },
      remove:  function (id)        { return remove(KEYS.PRODUCTS, id); }
    },

    categories: {
      getAll:  function ()          { return getAll(KEYS.CATEGORIES); },
      getById: function (id)        { return getById(KEYS.CATEGORIES, id); },
      add:     function (c)         { return add(KEYS.CATEGORIES, c); },
      update:  function (id, c)     { return update(KEYS.CATEGORIES, id, c); },
      remove:  function (id)        { return remove(KEYS.CATEGORIES, id); }
    },

    orders: {
      getAll:  function ()          { return getAll(KEYS.ORDERS); },
      getById: function (id)        { return getById(KEYS.ORDERS, id); },
      add:     function (o)         { return add(KEYS.ORDERS, o); },
      update:  function (id, o)     { return update(KEYS.ORDERS, id, o); },
      remove:  function (id)        { return remove(KEYS.ORDERS, id); }
    },

    discounts: {
      getAll:  function ()          { return getAll(KEYS.DISCOUNTS); },
      getById: function (id)        { return getById(KEYS.DISCOUNTS, id); },
      add:     function (d)         { return add(KEYS.DISCOUNTS, d); },
      update:  function (id, d)     { return update(KEYS.DISCOUNTS, id, d); },
      remove:  function (id)        { return remove(KEYS.DISCOUNTS, id); }
    },

    payments: {
      getAll:       function ()         { return getAll(KEYS.PAYMENTS); },
      getById:      function (id)       { return getById(KEYS.PAYMENTS, id); },
      add:          function (p)        { return add(KEYS.PAYMENTS, p); },
      update:       function (id, p)    { return update(KEYS.PAYMENTS, id, p); },
      remove:       function (id)       { return remove(KEYS.PAYMENTS, id); },
      getByOrderId: function (orderId)  {
        return getAll(KEYS.PAYMENTS).find(function (p) { return p.orderId === orderId; });
      }
    },

    settings: {
      get: function ()    { return getObject(KEYS.SETTINGS); },
      set: function (s)   { return setObject(KEYS.SETTINGS, s); }
    },

    activityLog: {
      getAll: function () { return getStore(KEYS.ACTIVITY_LOG); }
    }
  };

})();
