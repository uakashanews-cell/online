/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category } from '../types';
import { productService } from './productService';
import { categoryService } from './categoryService';
import {
  DELIVERY_TIME_TEXT,
  RETURN_POLICY_TEXT,
  WHATSAPP_NUMBER,
  PHONE_DISPLAY,
  CONTACT_EMAIL,
  ADDRESS,
  isPlaceholderEmail,
} from '../config/site';
import { formatPKR } from '../utils/ecommerce-logic';

export interface AssistantProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockLabel: string;
  variantsSummary?: string;
}

export interface AssistantReply {
  text: string;
  products?: AssistantProductCard[];
  actionLink?: {
    label: string;
    url: string;
  };
  showWhatsAppButton?: boolean;
  whatsAppPrompt?: string;
}

// 5-minute memory cache for assistant catalog
let cachedCatalog: { products: Product[]; categories: Category[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchAssistantCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  const now = Date.now();
  if (cachedCatalog && now - cachedCatalog.timestamp < CACHE_TTL_MS) {
    return { products: cachedCatalog.products, categories: cachedCatalog.categories };
  }

  const [categories, products] = await Promise.all([
    categoryService.getCategories(),
    productService.getProducts(),
  ]);

  const activeCats = categories.filter((c) => c.is_active);
  const activeProds = products.filter((p) => p.is_active);

  cachedCatalog = {
    products: activeProds,
    categories: activeCats,
    timestamp: now,
  };

  return { products: activeProds, categories: activeCats };
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Normalizes text for keyword matching: lowercase, strip punctuation, single whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a token matches any words in targets (with typo tolerance)
 */
function tokenMatchesAny(token: string, targets: string[]): boolean {
  if (token.length < 3) return false;
  for (const t of targets) {
    if (t === token || t.includes(token) || token.includes(t)) return true;
    const maxDist = token.length > 5 ? 2 : 1;
    if (Math.abs(token.length - t.length) <= maxDist && levenshtein(token, t) <= maxDist) {
      return true;
    }
  }
  return false;
}

/**
 * Finds products matching query tokens
 */
export function findMatchingProducts(normalizedQuery: string, products: Product[]): Product[] {
  const tokens = normalizedQuery.split(' ').filter((t) => t.length >= 3);
  const stopWords = new Set([
    'what', 'is', 'the', 'of', 'for', 'in', 'and', 'with', 'are', 'you',
    'have', 'show', 'view', 'me', 'tell', 'about', 'how', 'much', 'ki', 'ka',
    'ke', 'hai', 'kya', 'konsa', 'konsi', 'mujhe', 'chahiye', 'tak', 'under', 'below'
  ]);

  const searchTokens = tokens.filter((t) => !stopWords.has(t));
  if (searchTokens.length === 0) return [];

  const scored = products
    .map((product) => {
      const prodTokens = normalizeText(`${product.name} ${product.slug}`).split(' ');
      let score = 0;

      for (const st of searchTokens) {
        if (tokenMatchesAny(st, prodTokens)) {
          score += 2;
        }
      }

      // Check full string substring match
      if (normalizeText(product.name).includes(normalizedQuery)) {
        score += 5;
      }

      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.product);
}

/**
 * Maps a Product domain model into a client-safe AssistantProductCard
 */
export function toAssistantProductCard(product: Product): AssistantProductCard {
  const activeVariants = (product.variants || []).filter((v) => v.is_active);
  const totalStock = activeVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

  let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
  let stockLabel = 'In Stock';

  if (activeVariants.length > 0 && totalStock === 0) {
    stockStatus = 'out_of_stock';
    stockLabel = 'Out of Stock';
  } else if (activeVariants.some((v) => v.stock_quantity > 0 && v.stock_quantity <= 5)) {
    const lowest = Math.min(...activeVariants.map((v) => v.stock_quantity).filter((q) => q > 0));
    stockStatus = 'low_stock';
    stockLabel = `Only ${lowest} left`;
  }

  // Summary of available sizes and colors
  const sizes = Array.from(new Set(activeVariants.map((v) => v.size).filter(Boolean)));
  const colors = Array.from(new Set(activeVariants.map((v) => v.color).filter(Boolean)));
  const variantsSummary = [
    sizes.length > 0 ? `Sizes: ${sizes.join(', ')}` : '',
    colors.length > 0 ? `Colors: ${colors.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.base_price,
    image_url: product.image_url || (product.images && product.images[0]) || '',
    stockStatus,
    stockLabel,
    variantsSummary: variantsSummary || undefined,
  };
}

/**
 * Main Assistant Query Processor
 * Pure client-side logic answering questions based ONLY on public catalog data and site config.
 */
export async function processAssistantQuery(
  rawInput: string,
  customCatalog?: { products: Product[]; categories: Category[] }
): Promise<AssistantReply> {
  const trimmed = rawInput.trim().slice(0, 300);
  if (!trimmed) {
    return {
      text: 'Please type a question about our products, pricing, sizing, or delivery.',
    };
  }

  const query = normalizeText(trimmed);

  // Load public catalog data
  const { products, categories } = customCatalog || (await fetchAssistantCatalog());

  // 1. GREETINGS
  const greetingWords = ['hi', 'hello', 'salam', 'assalam', 'aoa', 'hey', 'good morning', 'good afternoon', 'good evening'];
  if (greetingWords.some((w) => query === w || query.startsWith(w + ' '))) {
    return {
      text: `Assalam-o-Alaikum! Welcome to BARVAKA. I can help you with product prices, available sizes & colors, stock status, delivery details, or gifts within your budget. What would you like to explore?`,
    };
  }

  // 2. THANKS
  const thanksWords = ['thank you', 'thanks', 'shukriya', 'jazakallah', 'jazak allah', 'thx'];
  if (thanksWords.some((w) => query.includes(w))) {
    return {
      text: `You're very welcome! If you need anything else or would like to place an order, feel free to ask or reach out on WhatsApp.`,
      showWhatsAppButton: true,
      whatsAppPrompt: 'Hello BARVAKA, I have an inquiry.',
    };
  }

  // 3. TALK TO HUMAN / SUPPORT / WHATSAPP
  const humanWords = ['human', 'agent', 'person', 'support', 'representative', 'real person', 'insan say baat', 'talk to someone', 'whatsapp', 'call'];
  if (humanWords.some((w) => query.includes(w))) {
    return {
      text: `You can chat directly with our team on WhatsApp at ${PHONE_DISPLAY} or call us directly. We are always happy to assist you personally!`,
      showWhatsAppButton: true,
      whatsAppPrompt: 'Hello BARVAKA, I would like to speak with a customer care representative.',
    };
  }

  // 4. ORDER TRACKING & ORDER STATUS (HARD RULE: Never reveal/accept personal data, send to /track-order)
  const trackWords = ['track', 'tracking', 'my order', 'order status', 'kahan hai mera order', 'order check', 'where is my order', 'parcel'];
  if (trackWords.some((w) => query.includes(w))) {
    return {
      text: `To check the status of your order, please visit our Track Order page with your Order Number (e.g. BRV-...) and phone number. We do not look up private customer orders in this chat to protect your privacy.`,
      actionLink: {
        label: 'Open Track Order',
        url: '/track-order',
      },
    };
  }

  // 5. HOW TO ORDER
  const orderWords = ['how to order', 'how to buy', 'order kaise', 'order kaisay', 'order place', 'buy kaise', 'khareedna'];
  if (orderWords.some((w) => query.includes(w))) {
    return {
      text: `Ordering from BARVAKA is simple:\n1. Browse our shop and click on any product.\n2. Choose your size/color and click "Add to Cart" or tap "Order on WhatsApp".\n3. Checkout with 100% Cash on Delivery (COD) and Free Delivery nationwide across Pakistan!`,
      actionLink: {
        label: 'Browse Catalog',
        url: '/shop',
      },
      showWhatsAppButton: true,
      whatsAppPrompt: 'Hello BARVAKA, I would like to place an order.',
    };
  }

  // 6. DELIVERY & PAYMENT
  const isDeliveryQuery = ['delivery', 'shipping', 'delivery fee', 'charges', 'deliver', 'courier', 'daak'].some((w) => query.includes(w));
  const isPaymentQuery = ['payment', 'cod', 'cash on delivery', 'pay', 'jazzcash', 'easypaisa', 'card', 'advance'].some((w) => query.includes(w));
  const isDeliveryTimeQuery = ['delivery time', 'how long', 'kab tak', 'kitne din', 'days', 'time lagega', 'when will i receive', 'time'].some((w) => query.includes(w));
  const isReturnQuery = ['return', 'exchange', 'refund', 'policy', 'wapsi', 'badalna'].some((w) => query.includes(w));

  if (isDeliveryTimeQuery || isReturnQuery) {
    const parts: string[] = [];
    if (isDeliveryTimeQuery) {
      if (DELIVERY_TIME_TEXT.trim()) {
        parts.push(`Delivery Time: ${DELIVERY_TIME_TEXT.trim()}`);
      }
    }
    if (isReturnQuery) {
      if (RETURN_POLICY_TEXT.trim()) {
        parts.push(`Return Policy: ${RETURN_POLICY_TEXT.trim()}`);
      }
    }

    if (parts.length > 0) {
      return {
        text: `${parts.join('\n\n')}\n\nAll orders include Free delivery on every order and Cash on delivery only.`,
      };
    } else {
      return {
        text: `For delivery time / returns, please message us on WhatsApp. Free delivery on every order and Cash on delivery only.`,
        showWhatsAppButton: true,
        whatsAppPrompt: 'Hello BARVAKA, I would like to know about delivery time and return policy.',
      };
    }
  }

  if (isDeliveryQuery || isPaymentQuery) {
    return {
      text: `Free delivery on every order. Payment: Cash on delivery only. You pay cash to the courier only upon receiving your package at your doorstep.`,
    };
  }

  // 7. CONTACT DETAILS
  const isContactQuery = ['contact', 'address', 'location', 'office', 'helpline', 'phone number', 'email', 'rabta', 'kahan hain'].some((w) => query.includes(w));
  if (isContactQuery) {
    const lines = [
      `Telephone / Helpline: ${PHONE_DISPLAY}`,
      `WhatsApp: ${PHONE_DISPLAY}`,
      `Address: ${ADDRESS}`,
    ];
    if (!isPlaceholderEmail(CONTACT_EMAIL)) {
      lines.push(`Email: ${CONTACT_EMAIL}`);
    }
    return {
      text: `Here are BARVAKA's official contact details:\n\n${lines.join('\n')}`,
      actionLink: {
        label: 'View Contact Page',
        url: '/contact',
      },
      showWhatsAppButton: true,
      whatsAppPrompt: 'Hello BARVAKA, I am reaching out for assistance.',
    };
  }

  // 8. BUDGET SEARCH ("gift under 3000", "kapray 2000 tak", "under 4000")
  const budgetMatch =
    query.match(/(?:under|below|less than|within|upto)\s+(\d+)/) ||
    query.match(/(\d+)\s*(?:tak|tk|ke andar|se kam)/);

  if (budgetMatch) {
    const maxBudget = parseInt(budgetMatch[1], 10);
    if (!isNaN(maxBudget) && maxBudget > 0) {
      const budgetProducts = products
        .filter((p) => p.base_price <= maxBudget)
        .sort((a, b) => a.base_price - b.base_price);

      if (budgetProducts.length > 0) {
        return {
          text: `Found ${budgetProducts.length} product${budgetProducts.length > 1 ? 's' : ''} at or below Rs. ${maxBudget.toLocaleString()}, cheapest first:`,
          products: budgetProducts.slice(0, 4).map(toAssistantProductCard),
          actionLink: {
            label: 'View All in Shop',
            url: '/shop',
          },
        };
      } else {
        return {
          text: `We currently do not have items under Rs. ${maxBudget.toLocaleString()}. Our starting collection begins from ${formatPKR(Math.min(...products.map((p) => p.base_price)))}. You can also check with us on WhatsApp for custom options.`,
          showWhatsAppButton: true,
          whatsAppPrompt: `Hello BARVAKA, do you have any gifts or items around Rs. ${maxBudget}?`,
        };
      }
    }
  }

  // 9. COMPARE TWO PRODUCTS ("compare kurta and wallet", "compare prodA with prodB")
  if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
    const matched = findMatchingProducts(query.replace(/compare|vs|versus|and|with/g, ' '), products);
    if (matched.length >= 2) {
      const p1 = matched[0];
      const p2 = matched[1];
      const p1Variants = (p1.variants || []).filter((v) => v.is_active);
      const p2Variants = (p2.variants || []).filter((v) => v.is_active);

      return {
        text: `Comparing "${p1.name}" vs "${p2.name}":\n\n• ${p1.name}: ${formatPKR(p1.base_price)} (${p1Variants.length} variant${p1Variants.length > 1 ? 's' : ''})\n• ${p2.name}: ${formatPKR(p2.base_price)} (${p2Variants.length} variant${p2Variants.length > 1 ? 's' : ''})\n\nBoth products include Free nationwide delivery with Cash on Delivery!`,
        products: [toAssistantProductCard(p1), toAssistantProductCard(p2)],
      };
    }
  }

  // 10. CATEGORIES SEARCH ("what do you sell", "show electronics", "categories", "departments")
  const isCategoryIntent = ['what do you sell', 'category', 'categories', 'departments', 'collections', 'kia bechtay ho', 'kya kya hai'].some((w) => query.includes(w));
  if (isCategoryIntent) {
    const catList = categories.map((c) => `• ${c.name}`).join('\n');
    return {
      text: `We offer premium collections across the following departments:\n\n${catList}\n\nAll orders enjoy Free delivery and Cash on delivery!`,
      actionLink: {
        label: 'Browse Departments',
        url: '/shop',
      },
    };
  }

  // Check if a specific category was requested (e.g. "show electronics", "attar collection")
  for (const cat of categories) {
    const catNorm = normalizeText(cat.name);
    if (query.includes(catNorm) || (cat.slug && query.includes(cat.slug))) {
      const catProducts = products
        .filter((p) => p.category_id === cat.id || p.category_id === cat.slug)
        .slice(0, 4);

      if (catProducts.length > 0) {
        return {
          text: `Here are our top products in ${cat.name}:`,
          products: catProducts.map(toAssistantProductCard),
          actionLink: {
            label: `View all ${cat.name}`,
            url: `/category/${cat.slug}`,
          },
        };
      }
    }
  }

  // 11. PRODUCT-SPECIFIC QUERIES (Price, Availability/Stock, Sizes/Colors)
  const matchedProducts = findMatchingProducts(query, products);

  if (matchedProducts.length > 0) {
    const targetProduct = matchedProducts[0];
    const activeVariants = (targetProduct.variants || []).filter((v) => v.is_active);
    const totalStock = activeVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

    // Intent: Price lookup ("price of kurta", "kurta ki qeemat", "how much is the wallet")
    const isPriceQuery = ['price', 'cost', 'rate', 'qeemat', 'keemat', 'kitne', 'kitna', 'kitnay', 'how much', 'kya rate'].some((w) => query.includes(w));
    if (isPriceQuery) {
      return {
        text: `The price of "${targetProduct.name}" is ${formatPKR(targetProduct.base_price)}. Free delivery and Cash on delivery on every order.`,
        products: [toAssistantProductCard(targetProduct)],
      };
    }

    // Intent: Sizes & Colors ("what sizes", "colors available", "rang", "fitting")
    const isSizeColorQuery = ['size', 'sizes', 'color', 'colors', 'colour', 'colours', 'rang', 'fitting', 'chest'].some((w) => query.includes(w));
    if (isSizeColorQuery) {
      const sizes = Array.from(new Set(activeVariants.map((v) => v.size).filter(Boolean)));
      const colors = Array.from(new Set(activeVariants.map((v) => v.color).filter(Boolean)));

      const lines = [`Options for "${targetProduct.name}":`];
      if (sizes.length > 0) lines.push(`• Available Sizes: ${sizes.join(', ')}`);
      if (colors.length > 0) lines.push(`• Available Colors: ${colors.join(', ')}`);
      if (sizes.length === 0 && colors.length === 0) {
        lines.push(`• Standard one-size fits all.`);
      }

      return {
        text: lines.join('\n'),
        products: [toAssistantProductCard(targetProduct)],
      };
    }

    // Intent: Availability & Stock ("in stock", "out of stock", "available hai", "mil jaye ga")
    const isStockQuery = ['stock', 'available', 'available hai', 'mil jaye ga', 'mil sakta', 'hai ya nahi', 'left'].some((w) => query.includes(w));
    if (isStockQuery) {
      if (totalStock === 0) {
        return {
          text: `"${targetProduct.name}" is currently Out of stock. Please check back soon or message us on WhatsApp for restock updates.`,
          products: [toAssistantProductCard(targetProduct)],
          showWhatsAppButton: true,
          whatsAppPrompt: `Hello BARVAKA, when will "${targetProduct.name}" be back in stock?`,
        };
      }

      const lowStockVariants = activeVariants.filter((v) => v.stock_quantity > 0 && v.stock_quantity <= 5);
      if (lowStockVariants.length > 0) {
        const variantNotes = lowStockVariants
          .map((v) => `${[v.color, v.size].filter(Boolean).join(' ')}: only ${v.stock_quantity} left`)
          .join(', ');
        return {
          text: `"${targetProduct.name}" is In stock (${variantNotes}). Order soon before it runs out!`,
          products: [toAssistantProductCard(targetProduct)],
        };
      }

      return {
        text: `"${targetProduct.name}" is In stock and ready to ship with Free delivery!`,
        products: [toAssistantProductCard(targetProduct)],
      };
    }

    // General matching products display
    return {
      text: `Here is what I found for "${targetProduct.name}" (Price: ${formatPKR(targetProduct.base_price)}):`,
      products: matchedProducts.slice(0, 3).map(toAssistantProductCard),
    };
  }

  // 12. FALLBACK FOR UNKNOWN QUESTION
  // Hard Rule: Never invent products or policies. Offer WhatsApp button for personal help.
  return {
    text: `I could not find exact information regarding your question in our current store catalog. For immediate personal assistance, please message our team on WhatsApp!`,
    showWhatsAppButton: true,
    whatsAppPrompt: `Hello BARVAKA, I have an inquiry: ${trimmed}`,
  };
}
