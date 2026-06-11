/**
 * ============================================================================
 * Kumar Agencies — Permissions Engine (permissions.js)
 * ============================================================================
 * Granular permission definitions grouped by category, plus runtime helpers
 * for checking, granting, and revoking permissions.
 *
 * Depends on: KA.Data
 * Namespace:  window.KA.Permissions
 * ============================================================================
 */

window.KA = window.KA || {};

KA.Permissions = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // PERMISSION DEFINITIONS — organised by functional category
  // Each category includes a human-readable label, a Lucide/Feather icon name,
  // and a map of permission keys to display names.
  // ---------------------------------------------------------------------------

  var DEFINITIONS = {

    products: {
      label: 'Product Management',
      icon: 'package',
      permissions: {
        'products.view':        'View Products',
        'products.add':         'Add Products',
        'products.edit':        'Edit Products',
        'products.delete':      'Delete Products',
        'products.changePrice': 'Change Prices',
        'products.changeStock': 'Change Stock'
      }
    },

    categories: {
      label: 'Category Management',
      icon: 'grid',
      permissions: {
        'categories.view':   'View Categories',
        'categories.add':    'Add Categories',
        'categories.edit':   'Edit Categories',
        'categories.delete': 'Delete Categories'
      }
    },

    orders: {
      label: 'Order Management',
      icon: 'shopping-cart',
      permissions: {
        'orders.view':         'View Orders',
        'orders.approve':      'Approve Large Orders',
        'orders.updateStatus': 'Update Order Status',
        'orders.cancel':       'Cancel Orders'
      }
    },

    payments: {
      label: 'Payment Management',
      icon: 'credit-card',
      permissions: {
        'payments.view':               'View Payments',
        'payments.manage':             'Manage Payment Methods',
        'payments.manageBankAccounts': 'Manage Bank Accounts',
        'payments.manageUpi':          'Manage UPI IDs'
      }
    },

    customers: {
      label: 'Customer Management',
      icon: 'users',
      permissions: {
        'customers.view':          'View Customers',
        'customers.enableDisable': 'Enable/Disable Accounts'
      }
    },

    employees: {
      label: 'Employee Management',
      icon: 'user-check',
      permissions: {
        'employees.view':              'View Employees',
        'employees.add':               'Add Employees',
        'employees.remove':            'Remove Employees',
        'employees.managePermissions': 'Manage Permissions'
      }
    },

    discounts: {
      label: 'Discount Management',
      icon: 'percent',
      permissions: {
        'discounts.view':          'View Discounts',
        'discounts.create':        'Create Discounts',
        'discounts.approve':       'Approve Discounts',
        'discounts.enableDisable': 'Enable/Disable Discounts'
      }
    },

    reports: {
      label: 'Reports',
      icon: 'bar-chart-2',
      permissions: {
        'reports.sales':     'View Sales Reports',
        'reports.inventory': 'View Inventory Reports',
        'reports.financial': 'View Financial Reports'
      }
    },

    settings: {
      label: 'Company Settings',
      icon: 'settings',
      permissions: {
        'settings.company': 'Change Company Settings',
        'settings.gst':     'Manage GST Details',
        'settings.logo':    'Upload Company Logo'
      }
    }
  };

  // ---------------------------------------------------------------------------
  // CUSTOMER FIXED PERMISSIONS
  // Customers always have exactly these permissions — they cannot be changed.
  // ---------------------------------------------------------------------------

  var CUSTOMER_PERMISSIONS = ['products.view', 'categories.view'];

  // ---------------------------------------------------------------------------
  // RUNTIME PERMISSION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Check whether a user has a specific permission.
   *
   * Rules:
   *  - Owner → always true (full access, no restrictions)
   *  - Customer → only the fixed CUSTOMER_PERMISSIONS list
   *  - Employee → whatever is in their `permissions` array
   *
   * @param {string} userId  - The user's id
   * @param {string} permKey - e.g. 'products.view'
   * @returns {boolean}
   */
  function hasPermission(userId, permKey) {
    var user = KA.Data.users.getById(userId);
    if (!user) return false;

    if (user.role === 'owner')    return true;
    if (user.role === 'customer') return CUSTOMER_PERMISSIONS.includes(permKey);
    if (user.role === 'employee') return (user.permissions || []).includes(permKey);

    return false;
  }

  /**
   * Grant a single permission to an employee.
   * No-ops silently if they already have it.
   *
   * @param {string} employeeId
   * @param {string} permKey
   * @returns {boolean} success
   */
  function grantPermission(employeeId, permKey) {
    var emp = KA.Data.users.getById(employeeId);
    if (!emp || emp.role !== 'employee') return false;

    var perms = emp.permissions || [];
    if (!perms.includes(permKey)) {
      perms.push(permKey);
    }
    KA.Data.users.update(employeeId, { permissions: perms });

    // Log the activity (KA.Auth may not be loaded yet during init, so guard)
    var currentUser = (KA.Auth && KA.Auth.currentUser) ? KA.Auth.currentUser() : null;
    KA.Data.logActivity(
      currentUser ? currentUser.id : null,
      'PERMISSION_GRANTED',
      "Granted '" + permKey + "' to " + emp.name
    );

    return true;
  }

  /**
   * Revoke a single permission from an employee.
   *
   * @param {string} employeeId
   * @param {string} permKey
   * @returns {boolean} success
   */
  function revokePermission(employeeId, permKey) {
    var emp = KA.Data.users.getById(employeeId);
    if (!emp || emp.role !== 'employee') return false;

    var perms = (emp.permissions || []).filter(function (p) { return p !== permKey; });
    KA.Data.users.update(employeeId, { permissions: perms });

    var currentUser = (KA.Auth && KA.Auth.currentUser) ? KA.Auth.currentUser() : null;
    KA.Data.logActivity(
      currentUser ? currentUser.id : null,
      'PERMISSION_REVOKED',
      "Revoked '" + permKey + "' from " + emp.name
    );

    return true;
  }

  /**
   * Get the full list of effective permission keys for a user.
   *
   * @param {string} userId
   * @returns {string[]}
   */
  function getPermissionsForUser(userId) {
    var user = KA.Data.users.getById(userId);
    if (!user) return [];

    // Owner gets every defined permission
    if (user.role === 'owner') {
      return Object.values(DEFINITIONS).reduce(function (acc, cat) {
        return acc.concat(Object.keys(cat.permissions));
      }, []);
    }

    if (user.role === 'customer') return CUSTOMER_PERMISSIONS.slice(); // copy
    return (user.permissions || []).slice(); // copy
  }

  /**
   * Return a flat array of every permission key defined in the system.
   * Useful for "select all / deselect all" UI controls.
   *
   * @returns {string[]}
   */
  function getAllPermissionKeys() {
    return Object.values(DEFINITIONS).reduce(function (acc, cat) {
      return acc.concat(Object.keys(cat.permissions));
    }, []);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  return {
    DEFINITIONS:          DEFINITIONS,
    CUSTOMER_PERMISSIONS: CUSTOMER_PERMISSIONS,
    hasPermission:        hasPermission,
    grantPermission:      grantPermission,
    revokePermission:     revokePermission,
    getPermissionsForUser: getPermissionsForUser,
    getAllPermissionKeys:  getAllPermissionKeys
  };

})();
