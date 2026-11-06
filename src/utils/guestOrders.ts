/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StoredGuestOrder {
  order_number: string;
  phone: string;
  placed_at: string;
}

const STORAGE_KEY = 'arooj_guest_orders';
const SEEN_STATUS_KEY = 'arooj_order_seen_statuses';
const MAX_GUEST_ORDERS = 50;

/**
 * Saves an order number and phone to this device's localStorage for guest order tracking.
 * Strictly stores order_number, phone, and timestamp — NO personal addresses or card data.
 * Keeps at most 50 orders, newest first.
 */
export function saveGuestOrder(orderNumber: string, phone: string): void {
  if (!orderNumber || !phone) return;
  try {
    const cleanNum = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.trim();
    const existing = getStoredGuestOrders();

    // Remove duplicates if same order number was already saved
    const filtered = existing.filter((o) => o.order_number.toUpperCase() !== cleanNum);

    const updated: StoredGuestOrder[] = [
      {
        order_number: cleanNum,
        phone: cleanPhone,
        placed_at: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, MAX_GUEST_ORDERS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save guest order to localStorage:', err);
  }
}

/**
 * Retrieves the stored guest orders from localStorage.
 */
export function getStoredGuestOrders(): StoredGuestOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => item && typeof item.order_number === 'string' && typeof item.phone === 'string'
      );
    }
    return [];
  } catch (err) {
    console.warn('Could not read guest orders from localStorage:', err);
    return [];
  }
}

/**
 * Removes a stored guest order entry.
 */
export function removeStoredGuestOrder(orderNumber: string): void {
  try {
    const cleanNum = orderNumber.trim().toUpperCase();
    const existing = getStoredGuestOrders();
    const filtered = existing.filter((o) => o.order_number.toUpperCase() !== cleanNum);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not remove guest order from localStorage:', err);
  }
}

/**
 * Retrieves map of seen order statuses: { [orderNumber]: status }
 */
export function getSeenStatuses(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SEEN_STATUS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/**
 * Records that the customer has seen this order at its current status.
 */
export function markOrderSeen(orderNumber: string, status: string): void {
  if (!orderNumber || !status) return;
  try {
    const cleanNum = orderNumber.trim().toUpperCase();
    const existing = getSeenStatuses();
    existing[cleanNum] = status.toLowerCase();
    localStorage.setItem(SEEN_STATUS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Could not mark order status seen:', err);
  }
}

/**
 * Checks if an order's status has updated since the customer last saw it.
 */
export function isOrderUpdated(orderNumber: string, currentStatus: string): boolean {
  if (!orderNumber || !currentStatus) return false;
  try {
    const cleanNum = orderNumber.trim().toUpperCase();
    const seen = getSeenStatuses();
    const lastSeen = seen[cleanNum];
    if (!lastSeen) return false; // First time viewing, not an "updated" notification
    return lastSeen.toLowerCase() !== currentStatus.toLowerCase();
  } catch {
    return false;
  }
}
