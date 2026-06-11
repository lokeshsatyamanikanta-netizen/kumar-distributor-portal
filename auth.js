/**
 * ============================================================================
 * Kumar Agencies — Authentication Module (auth.js)
 * ============================================================================
 * Handles login/logout, session management (via sessionStorage), and provides
 * quick-access helpers for the currently logged-in user's role & permissions.
 *
 * Depends on: KA.Data, KA.Permissions
 * Namespace:  window.KA.Auth
 * ============================================================================
 */

window.KA = window.KA || {};

KA.Auth = (function () {
  'use strict';

  // Session is stored in sessionStorage so it clears when the tab closes
  var SESSION_KEY = 'ka_session';

  // ---------------------------------------------------------------------------
  // LOGIN / LOGOUT
  // ---------------------------------------------------------------------------

  /**
   * Authenticate a user by username & password.
   *
   * @param {string} username
   * @param {string} password
   * @returns {{ success: boolean, user?: object, error?: string }}
   */
  function login(username, password) {
    var user = KA.Data.users.getByUsername(username);

    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (user.password !== password) {
      return { success: false, error: 'Invalid password' };
    }
    if (!user.enabled) {
      return { success: false, error: 'Account is disabled. Contact the owner.' };
    }

    // Persist minimal session payload
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      userId:  user.id,
      role:    user.role,
      loginAt: new Date().toISOString()
    }));

    KA.Data.logActivity(user.id, 'LOGIN', user.name + ' logged in');

    return { success: true, user: user };
  }

  /**
   * End the current session and log the event.
   */
  function logout() {
    var user = currentUser();
    if (user) {
      KA.Data.logActivity(user.id, 'LOGOUT', user.name + ' logged out');
    }
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ---------------------------------------------------------------------------
  // SESSION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Return the full user object for the currently logged-in user, or null.
   * Re-fetches from localStorage on every call so data is always fresh.
   */
  function currentUser() {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      var session = JSON.parse(raw);
      if (!session || !session.userId) return null;
      return KA.Data.users.getById(session.userId) || null;
    } catch (e) {
      console.error('[KA.Auth] Failed to parse session', e);
      return null;
    }
  }

  /** Is anyone logged in? */
  function isLoggedIn() {
    return !!currentUser();
  }

  /** Quick role checks */
  function isOwner()    { var u = currentUser(); return u ? u.role === 'owner'    : false; }
  function isEmployee() { var u = currentUser(); return u ? u.role === 'employee' : false; }
  function isCustomer() { var u = currentUser(); return u ? u.role === 'customer' : false; }

  /**
   * Shorthand: does the current user have a specific permission?
   *
   * @param {string} permKey - e.g. 'products.edit'
   * @returns {boolean}
   */
  function can(permKey) {
    var u = currentUser();
    return u ? KA.Permissions.hasPermission(u.id, permKey) : false;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  return {
    login:       login,
    logout:      logout,
    currentUser: currentUser,
    isLoggedIn:  isLoggedIn,
    isOwner:     isOwner,
    isEmployee:  isEmployee,
    isCustomer:  isCustomer,
    can:         can
  };

})();
