/**
 * ============================================================================
 * Kumar Agencies — User Management Module (users.js)
 * ============================================================================
 * High-level CRUD operations for employees and customers.
 * Permission enforcement is the responsibility of the UI layer; this module
 * performs the data operations and logs all activity.
 *
 * Depends on: KA.Data, KA.Auth
 * Namespace:  window.KA.Users
 * ============================================================================
 */

window.KA = window.KA || {};

KA.Users = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // EMPLOYEE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Add a new employee account.
   *
   * @param {object} data - { username, password, name, email, phone, permissions:[] }
   * @returns {{ success: boolean, user?: object, error?: string }}
   */
  function addEmployee(data) {
    // Guard: duplicate username
    if (KA.Data.users.getByUsername(data.username)) {
      return { success: false, error: 'Username already exists' };
    }

    var emp = KA.Data.users.add({
      username:    data.username,
      password:    data.password,
      name:        data.name,
      email:       data.email  || '',
      phone:       data.phone  || '',
      role:        'employee',
      enabled:     true,
      permissions: data.permissions || []
    });

    var current = KA.Auth.currentUser();
    KA.Data.logActivity(
      current ? current.id : null,
      'EMPLOYEE_ADDED',
      'Added employee: ' + emp.name
    );

    return { success: true, user: emp };
  }

  /**
   * Permanently remove an employee account.
   *
   * @param {string} id - Employee user id
   * @returns {{ success: boolean, error?: string }}
   */
  function removeEmployee(id) {
    var emp = KA.Data.users.getById(id);
    if (!emp || emp.role !== 'employee') {
      return { success: false, error: 'Employee not found' };
    }

    KA.Data.users.remove(id);

    var current = KA.Auth.currentUser();
    KA.Data.logActivity(
      current ? current.id : null,
      'EMPLOYEE_REMOVED',
      'Removed employee: ' + emp.name
    );

    return { success: true };
  }

  /**
   * Update an employee's profile or permissions.
   *
   * @param {string} id   - Employee user id
   * @param {object} data - Partial update fields
   * @returns {{ success: boolean, error?: string }}
   */
  function updateEmployee(id, data) {
    var emp = KA.Data.users.getById(id);
    if (!emp || emp.role !== 'employee') {
      return { success: false, error: 'Employee not found' };
    }

    KA.Data.users.update(id, data);

    var current = KA.Auth.currentUser();
    KA.Data.logActivity(
      current ? current.id : null,
      'EMPLOYEE_UPDATED',
      'Updated employee: ' + emp.name
    );

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // CUSTOMER MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Register a new customer account.
   *
   * @param {object} data - { username, password, name, email, phone }
   * @returns {{ success: boolean, user?: object, error?: string }}
   */
  function addCustomer(data) {
    if (KA.Data.users.getByUsername(data.username)) {
      return { success: false, error: 'Username already exists' };
    }

    var cust = KA.Data.users.add({
      username:    data.username,
      password:    data.password,
      name:        data.name,
      email:       data.email || '',
      phone:       data.phone || '',
      role:        'customer',
      enabled:     true,
      permissions: []   // Customers use fixed permissions, not per-user
    });

    var current = KA.Auth.currentUser();
    KA.Data.logActivity(
      current ? current.id : null,
      'CUSTOMER_ADDED',
      'Added customer: ' + cust.name
    );

    return { success: true, user: cust };
  }

  /**
   * Toggle a customer's enabled/disabled status.
   * Disabled customers cannot log in.
   *
   * @param {string} id - Customer user id
   * @returns {{ success: boolean, error?: string }}
   */
  function toggleCustomer(id) {
    var cust = KA.Data.users.getById(id);
    if (!cust || cust.role !== 'customer') {
      return { success: false, error: 'Customer not found' };
    }

    var newState = !cust.enabled;
    KA.Data.users.update(id, { enabled: newState });

    var current = KA.Auth.currentUser();
    KA.Data.logActivity(
      current ? current.id : null,
      'CUSTOMER_TOGGLED',
      (newState ? 'Enabled' : 'Disabled') + ' customer: ' + cust.name
    );

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // QUERY HELPERS
  // ---------------------------------------------------------------------------

  /** Return all employee users */
  function getEmployees() {
    return KA.Data.users.getAll().filter(function (u) { return u.role === 'employee'; });
  }

  /** Return all customer users */
  function getCustomers() {
    return KA.Data.users.getAll().filter(function (u) { return u.role === 'customer'; });
  }

  /** Return the owner user (there should be exactly one) */
  function getOwner() {
    return KA.Data.users.getAll().find(function (u) { return u.role === 'owner'; });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  return {
    addEmployee:    addEmployee,
    removeEmployee: removeEmployee,
    updateEmployee: updateEmployee,
    addCustomer:    addCustomer,
    toggleCustomer: toggleCustomer,
    getEmployees:   getEmployees,
    getCustomers:   getCustomers,
    getOwner:       getOwner
  };

})();
