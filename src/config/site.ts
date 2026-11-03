/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ADMIN_EMAIL = 'uakashafanny@gmail.com';
export const WHATSAPP_NUMBER = '923027651284';
export const CALL_NUMBER = '923027651284';
export const PHONE_DISPLAY = '0302-7651284';
export const CONTACT_EMAIL = 'uakashanews@gmail.com';
export const ADDRESS = 'Rahim Yar Khan, Punjab, Pakistan';
export const DELIVERY_TIME_TEXT = '';
export const RETURN_POLICY_TEXT = '';
export const SITE_URL = 'https://REPLACE_WITH_MY_DOMAIN';
export const SOCIAL_FACEBOOK = '';
export const SOCIAL_INSTAGRAM = '';

/**
 * Checks whether an email address is a placeholder.
 * Treats only an empty value or the literal 'REPLACE_ME' as a placeholder.
 */
export function isPlaceholderEmail(email?: string | null): boolean {
  if (!email) return true;
  const trimmed = email.trim();
  return trimmed === '' || trimmed === 'REPLACE_ME';
}

export const siteConfig = {
  name: "BARVAKA",
  tagline: "Quality · Fast Delivery · Trust · Khayr",
  subtitle: "Pakistan's Premier Multi-Category Online Store",
  currency: "PKR",
  currencySymbol: "Rs.",
  deliveryFee: 0,
  freeDeliveryThreshold: 0, // Always free delivery
  support: {
    whatsapp: "+92 302 7651284",
    whatsappDisplay: PHONE_DISPLAY,
    whatsappNumber: WHATSAPP_NUMBER,
    phone: PHONE_DISPLAY,
    callNumber: CALL_NUMBER,
    email: CONTACT_EMAIL,
    address: ADDRESS,
    city: "Rahim Yar Khan",
    province: "Punjab",
    country: "Pakistan",
    timing: "",
  },
  social: {
    facebook: SOCIAL_FACEBOOK,
    instagram: SOCIAL_INSTAGRAM,
  },
  pillars: [
    {
      title: "Quality",
      description: "Rigorous quality check on every fabric, stitch, and component.",
      icon: "ShieldCheck",
    },
    {
      title: "Fast Delivery",
      description: "Free delivery on all orders nationwide across Pakistan.",
      icon: "Truck",
    },
    {
      title: "Trust",
      description: "Cash on delivery only. Pay upon receiving your package.",
      icon: "CheckCircle2",
    },
    {
      title: "Khayr",
      description: "Honest pricing and genuine customer service.",
      icon: "HeartHandshake",
    },
  ],
};
