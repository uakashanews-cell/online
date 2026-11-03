/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WHATSAPP_NUMBER } from '../config/site';
import { Order, CartItem, Product, ProductVariant } from '../types';

/**
 * Note on WhatsApp direct ordering and images:
 * Direct wa.me links (WhatsApp Click to Chat) do not support uploading or attaching raw binary files
 * directly through URL parameters. However, WhatsApp automatically generates and renders rich visual
 * preview cards and thumbnails when valid absolute HTTPS image URLs are included in the text,
 * especially when the primary image URL is positioned prominently near the beginning of the message.
 */

/**
 * Ensures an image or page URL is an absolute HTTPS URL.
 * If a relative path is passed (e.g. /images/products/kurta.jpg), it is prefixed with
 * the current origin (e.g. https://barvaka.pk/images/...).
 */
export function toAbsoluteUrl(urlOrPath: string, origin?: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  const base =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://barvaka.pk');
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Normalizes Pakistan phone numbers to international digits-only format: 923XXXXXXXXX.
 * Converts 03XXXXXXXXX or +923XXXXXXXXX or 03XX-XXXXXXX into 923XXXXXXXXX.
 */
export function normalizePkPhone(phone: string): string {
  if (!phone) return WHATSAPP_NUMBER;
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // 03XXXXXXXXX (11 digits starting with 03) -> 923XXXXXXXXX
  if (digits.length === 11 && digits.startsWith('03')) {
    return `92${digits.slice(1)}`;
  }

  // 923XXXXXXXXX (12 digits starting with 923) -> 923XXXXXXXXX
  if (digits.length === 12 && digits.startsWith('923')) {
    return digits;
  }

  // 3XXXXXXXXX (10 digits starting with 3) -> 923XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('3')) {
    return `92${digits}`;
  }

  // Fallback: return stripped digits if available, else standard store number
  return digits || WHATSAPP_NUMBER;
}

/**
 * Constructs a secure wa.me click-to-chat URL with prefilled URL-encoded message text.
 */
export function buildWhatsAppUrl(message: string, targetPhone?: string): string {
  const phone = targetPhone ? normalizePkPhone(targetPhone) : WHATSAPP_NUMBER;
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedText}`;
}

/**
 * Formats a single product order message for /product/:slug.
 * Exact format requested:
 *
 * Hello BARVAKA, I want to order this product:
 *
 * *{Product name}*
 * Variant: {Size} / {Color}
 * Quantity: {qty}
 * Price: Rs. {unit price} each
 * Total: Rs. {line total} (Free Delivery, Cash on Delivery)
 *
 * Product image: {absolute image URL of the selected product's main image}
 * Product link: {window.location.origin}/product/{slug}
 */
export function formatProductMessage(params: {
  product: Pick<Product, 'name' | 'slug' | 'images' | 'base_price'>;
  variant?: Pick<ProductVariant, 'size' | 'color' | 'price'> | null;
  quantity: number;
  origin?: string;
}): string {
  const { product, variant, quantity, origin } = params;
  const unitPrice =
    variant?.price !== null && variant?.price !== undefined && variant.price > 0
      ? variant.price
      : product.base_price;
  const lineTotal = unitPrice * quantity;

  // Build clean variant label
  let variantText = 'Standard';
  if (variant?.size && variant?.color) {
    variantText = `${variant.size} / ${variant.color}`;
  } else if (variant?.size) {
    variantText = variant.size;
  } else if (variant?.color) {
    variantText = variant.color;
  }

  const primaryImage = product.images?.[0] || '';
  const absoluteImage = toAbsoluteUrl(primaryImage, origin);
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://barvaka.pk');
  const productLink = `${baseOrigin.replace(/\/+$/, '')}/product/${product.slug}`;

  return [
    'Hello BARVAKA, I want to order this product:',
    '',
    `*${product.name}*`,
    `Variant: ${variantText}`,
    `Quantity: ${quantity}`,
    `Price: Rs. ${unitPrice.toLocaleString('en-PK')} each`,
    `Total: Rs. ${lineTotal.toLocaleString('en-PK')} (Free Delivery, Cash on Delivery)`,
    '',
    `Product image: ${absoluteImage}`,
    `Product link: ${productLink}`,
  ].join('\n');
}

/**
 * Formats the entire shopping cart for ordering via WhatsApp.
 * - Puts the FIRST item's image URL near the top for thumbnail preview.
 * - Lists items (first 10, then +N more items if > 10).
 * - Appends subtotal, discount, Free delivery, total, and Cash on Delivery.
 * - Keeps final URL under 2000 characters by truncating item descriptions if needed.
 */
export function formatCartMessage(params: {
  items: Array<{
    product_name: string;
    variant_label: string;
    quantity: number;
    unit_price: number;
    image_url: string;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  origin?: string;
}): string {
  const { items, subtotal, discount, total, couponCode, origin } = params;

  if (!items || items.length === 0) {
    return 'Hello BARVAKA, I would like to place an order for items in my cart.';
  }

  const firstItemImage = toAbsoluteUrl(items[0]?.image_url || '', origin);
  const maxItemsToShow = 10;
  const displayedItems = items.slice(0, maxItemsToShow);
  const remainingCount = items.length - maxItemsToShow;

  const lines: string[] = [
    'Hello BARVAKA, I want to order these items from my cart:',
    `Preview: ${firstItemImage}`,
    '',
    '📦 *Order Items:*',
  ];

  displayedItems.forEach((item, idx) => {
    const itemImg = toAbsoluteUrl(item.image_url, origin);
    const lineTotal = item.unit_price * item.quantity;
    lines.push(
      `${idx + 1}. *${item.product_name}* (${item.variant_label})`,
      `   Qty: ${item.quantity} × Rs. ${item.unit_price.toLocaleString('en-PK')} = Rs. ${lineTotal.toLocaleString('en-PK')}`,
      `   Image: ${itemImg}`
    );
  });

  if (remainingCount > 0) {
    lines.push(`+${remainingCount} more items`);
  }

  lines.push('');
  lines.push(`Subtotal: Rs. ${subtotal.toLocaleString('en-PK')}`);
  if (discount > 0) {
    lines.push(
      `Discount${couponCode ? ` (${couponCode})` : ''}: -Rs. ${discount.toLocaleString('en-PK')}`
    );
  }
  lines.push('Delivery: Free');
  lines.push(`Total: Rs. ${total.toLocaleString('en-PK')}`);
  lines.push('Payment: Cash on Delivery');

  let fullMessage = lines.join('\n');

  // Ensure full wa.me URL length stays safely under 2000 characters
  // wa.me/923027651284?text= is approx 35 chars
  const maxSafeCharLimit = 1850;
  if (encodeURIComponent(fullMessage).length > maxSafeCharLimit) {
    // Compact items representation if URL is too long
    const compactLines: string[] = [
      'Hello BARVAKA, I want to order these items from my cart:',
      `Preview: ${firstItemImage}`,
      '',
      '📦 *Order Items:*',
    ];
    displayedItems.forEach((item, idx) => {
      const lineTotal = item.unit_price * item.quantity;
      compactLines.push(
        `${idx + 1}. *${item.product_name}* (${item.variant_label}) - Qty: ${item.quantity} (Rs. ${lineTotal.toLocaleString('en-PK')})`
      );
    });
    if (remainingCount > 0) {
      compactLines.push(`+${remainingCount} more items`);
    }
    compactLines.push('');
    compactLines.push(`Subtotal: Rs. ${subtotal.toLocaleString('en-PK')}`);
    if (discount > 0) {
      compactLines.push(`Discount: -Rs. ${discount.toLocaleString('en-PK')}`);
    }
    compactLines.push('Delivery: Free');
    compactLines.push(`Total: Rs. ${total.toLocaleString('en-PK')}`);
    compactLines.push('Payment: Cash on Delivery');
    fullMessage = compactLines.join('\n');
  }

  return fullMessage;
}

/**
 * Formats order confirmation message after checkout (/order-success/:orderNumber).
 * Includes order number, customer name, phone, address & city, items with absolute image URLs,
 * subtotal, discount, delivery: Free, total, Cash on Delivery, and tracking link.
 */
export function formatOrderMessage(params: { order: Order; origin?: string }): string {
  const { order, origin } = params;
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://barvaka.pk');
  const trackingLink = `${baseOrigin.replace(/\/+$/, '')}/track-order?orderNumber=${encodeURIComponent(
    order.order_number
  )}&phone=${encodeURIComponent(order.customer_phone)}`;

  const firstItemImage = order.items?.[0] ? toAbsoluteUrl(order.items[0].image_url, origin) : '';

  const lines: string[] = [
    'Hello BARVAKA, I have placed an order on your website:',
    `*Order #${order.order_number}*`,
    firstItemImage ? `Preview: ${firstItemImage}` : '',
    '',
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Address: ${order.shipping_address}, ${order.city}, ${order.province}`,
    '',
    '📦 *Items Ordered:*',
  ].filter(Boolean);

  order.items.forEach((item, idx) => {
    const itemImg = toAbsoluteUrl(item.image_url, origin);
    lines.push(
      `${idx + 1}. *${item.product_name}* (${item.variant_label})`,
      `   Qty: ${item.quantity} × Rs. ${item.unit_price.toLocaleString('en-PK')} = Rs. ${item.line_total.toLocaleString('en-PK')}`,
      `   Image: ${itemImg}`
    );
  });

  lines.push('');
  lines.push(`Subtotal: Rs. ${order.subtotal.toLocaleString('en-PK')}`);
  if (order.discount_amount > 0) {
    lines.push(
      `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}: -Rs. ${order.discount_amount.toLocaleString('en-PK')}`
    );
  }
  lines.push('Delivery: Free');
  lines.push(`Total: Rs. ${order.total.toLocaleString('en-PK')}`);
  lines.push('Payment: Cash on Delivery');
  lines.push(`Tracking link: ${trackingLink}`);

  return lines.join('\n');
}

/**
 * Formats admin customer message for /admin/orders/:id.
 * Prefilled text with order number, current status, and total.
 */
export function formatCustomerUpdateMessage(order: {
  order_number: string;
  status: string;
  total: number;
  customer_name?: string;
}): string {
  const statusLabels: Record<string, string> = {
    pending: 'Pending Verification',
    confirmed: 'Confirmed & Being Packed',
    shipped: 'Dispatched & On the Way with Courier',
    delivered: 'Delivered Successfully',
    cancelled: 'Cancelled',
  };

  const readableStatus = statusLabels[order.status] || order.status.toUpperCase();
  const greeting = order.customer_name ? `Assalam-o-Alaikum ${order.customer_name}` : 'Assalam-o-Alaikum';

  return [
    `${greeting},`,
    `This is BARVAKA regarding your Order *#${order.order_number}*.`,
    '',
    `Current Status: *${readableStatus}*`,
    `Total Amount (COD): *Rs. ${order.total.toLocaleString('en-PK')}*`,
    'Delivery: Free nationwide delivery.',
    '',
    'If you have any questions or would like to confirm your delivery timing, feel free to reply to this message.',
  ].join('\n');
}
