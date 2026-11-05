# Arooj — Online Store

Arooj is Pakistan's online store delivering stitched apparel, pure artisanal attars, genuine leather goods, and lifestyle essentials nationwide. Built upon the brand motto: **Shop smart · Live better**.

---

## Key Features

* **100% Cash on Delivery (COD)**: Dedicated single-page checkout optimized for Pakistan with zero prepayments required.
* **Free Delivery Nationwide**: Express dispatch across 200+ Pakistani cities with open parcel inspection allowed at the doorstep.
* **Warm Boutique Aesthetics**: Warm cream background, terracotta accents, sage green, and refined serif headings matching the official Arooj brand identity.
* **Arooj Assistant**: Client-side instant store advisor answering questions on pricing, stock, sizing, categories, and delivery from live catalog data without external AI APIs.
* **Instant Demo Mode**: Automatically active out of the box when Supabase environment variables are unset. Seamlessly switch between **Guest**, **Customer**, and **Store Owner (Admin)** views in the top navigation bar.
* **Production-Ready PostgreSQL Backend**: Complete schema (`/supabase/schema.sql`) and initial seed data (`/supabase/seed.sql`) implementing Row Level Security (RLS), atomic RPCs (`place_order`, `get_guest_order`, `validate_coupon`, `update_order_status`, `admin_dashboard_stats`), and automated inventory management.

---

## Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Motion.
* **Form & Validation**: React Hook Form, Zod.
* **Data & State**: TanStack React Query v5, Context API, LocalStorage persistence.
* **Backend / Database**: Supabase (PostgreSQL 15+), Server-Side Express Proxy (`server.ts`).
* **Assistant**: Client-side semantic search & catalog reasoning engine.

---

## Environment Variables

Copy `.env.example` to `.env` when connecting your live Supabase project:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

> **Demo Mode**: If `VITE_SUPABASE_URL` is omitted or contains `your-project`, the app automatically runs in offline Demo Mode. When both variables are supplied with your actual Supabase credentials, the entire store runs in **Real Mode** against live PostgreSQL tables and cloud image storage.

---

## Connect Supabase

Follow these 7 steps to connect Arooj to your live Supabase backend:

1. **Create Project**: Create a new project at [supabase.com](https://supabase.com).
2. **Run SQL Schema**: Open the **SQL Editor** in your Supabase dashboard, paste the contents of `supabase/schema.sql`, and click **Run**. This idempotently sets up all 9 tables, indexes, triggers, Row Level Security policies, RPCs (`place_order`, `validate_coupon`, `get_guest_order`, `update_order_status`, `admin_dashboard_stats`), and the `'product-images'` public storage bucket.
3. **Set Environment Variables**: In **Project Settings > API**, copy your **Project URL** and **anon public key**. Set them in your environment as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Create Admin User**: In **Authentication > Users**, create the administrator user with email `uakashafanny@gmail.com` and your desired secure password.
5. **Elevate Admin Role**: In **Table Editor > profiles** (or via SQL Editor), set `role = 'admin'` for `uakashafanny@gmail.com`:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE lower(email) = 'uakashafanny@gmail.com';
   ```
6. **Configure Site URL**: In **Authentication > URL Configuration**, set **Site URL** to your application's URL.
7. **Deploy**: Build and deploy your application (`npm run build`). Log in at `/admin/login` and use the **Connection Status** card on `/admin` to verify with **Run Test**.

---

## Available Scripts

* `npm run dev`: Starts the local full-stack development server with Vite middleware on port 3000.
* `npm run build`: Compiles TypeScript and creates optimized production client bundles in `dist`.
* `npm run preview`: Previews the compiled production build locally.
* `npm run lint`: Validates TypeScript types across the codebase (`tsc --noEmit`).
* `npm test`: Runs Node test runner on unit tests.

---

## Storefront & Admin Routes

| Route | Description |
|---|---|
| `/` | Homepage with hero banner, categories, featured picks, new arrivals, and trust strip |
| `/shop` | Full catalog with price filter, category filter, sorting, and live search |
| `/category/:slug` | Filtered category collection page |
| `/product/:slug` | Two-column product detail page (desktop) and stacked view with sticky bottom bar (mobile) |
| `/cart` | Shopping bag with quantity controls, item removal, and live coupon application |
| `/checkout` | Minimalist single-form COD checkout |
| `/order-success/:orderNumber` | Post-order confirmation with order summary and COD instructions |
| `/track-order` | Real-time guest order tracking by order number and mobile number |
| `/about` | Brand philosophy, craftsmanship heritage, and ethical trade principles |
| `/contact` | Customer care contacts, warehouse address, and official WhatsApp hotline |
| `/login` / `/register` | Customer sign in and account registration |
| `/account` | Customer profile management and address books |
| `/account/orders` | Order history and detailed status tracking for registered customers |
| `/wishlist` | Saved favorite products |
| `/admin/login` | Dedicated security login gate with lockout rate limiting and inactivity protection |
| `/admin` | Store Owner Dashboard with sales metrics, 7/30 day charts, and low stock warnings |
| `/admin/products` | Catalog manager with variant editor and inventory adjustment |
| `/admin/categories` | Department and collection management |
| `/admin/orders` | Order dispatch manager with status updater and stock restoration on cancellation |
| `/admin/coupons` | Promotion and discount coupon configuration |
| `/admin/customers` | Customer directory and transaction history |

---

## Admin Security & Access Control

Arooj implements a dedicated, secure login gate for administrative operations:

* **Admin Identity**: Only `uakashafanny@gmail.com` (configured in `src/config/site.ts` as `ADMIN_EMAIL`) may access the administrative control center.
* **Strict Zero Password Exposure**: The real administrator password is **NEVER stored anywhere in code, repository files, `.env`, README, comments, or localStorage**. The password is set and managed exclusively in Supabase Auth.
* **Production Supabase Setup**:
  1. Create the admin user in Supabase Auth dashboard (**Authentication > Users**) with email `uakashafanny@gmail.com` and a secure password.
  2. In the Supabase SQL editor, elevate the created user's profile to admin:
     ```sql
     UPDATE public.profiles
     SET role = 'admin'
     WHERE email = 'uakashafanny@gmail.com';
     ```
* **Admin Login Buttons**:
  - A visible **Admin Login** button is available in the Footer on all pages.
  - A compact shield/lock icon button is located in the Header immediately adjacent to the account icon.
  - Both buttons link to `/admin/login`. Once authenticated as the admin, both buttons dynamically change their label to **Admin Panel** and link directly to `/admin`.
* **Route Protection & Gatekeeping**:
  - Every route under `/admin/*` (except `/admin/login`) strictly redirects to `/admin/login` unless the user is signed in AND verified as the store owner (`ADMIN_EMAIL` with `role = 'admin'`).
  - Customers signed in at `/login` who navigate to `/admin/*` are immediately bounced back to `/` with an `"Access denied"` toast notification.
  - A security loading spinner prevents any admin data or dashboard metrics from being rendered before the authorization check completes.
* **Brute-Force Protection**:
  - After 5 consecutive failed login attempts, the `/admin/login` form is locked for 60 seconds with an active countdown display.
  - Erroneous credentials return only the generic message: `"Invalid email or password."` (never disclosing which field was incorrect).
* **Session Inactivity Guard**:
  - Visible **Logout Admin** button prominently placed in the admin sidebar.
  - Inactivity watchdog automatically logs out the admin and redirects to `/admin/login` after 30 minutes of user idle time.
* **Offline Demo Mode**:
  - When Supabase credentials are not present in `.env`, `/admin/login` accepts `uakashafanny@gmail.com` with the demo preview password `demo1234` and displays a note.
  - This demo fallback is completely disabled once live Supabase environment variables are provided.

---

## WhatsApp Ordering & Instant Support

Arooj integrates direct-to-WhatsApp ordering and customer support across storefront and admin workflows:

* **WhatsApp Helpline Number**:
  - Configured in `src/config/site.ts` as `WHATSAPP_NUMBER = '923039160621'` (digits only with Pakistan country code `92`, no spaces or `+`).
  - Helper functions in `src/lib/whatsapp.ts` normalize local numbers (`03XXXXXXXXX` or `+923XXXXXXXXX`) to the `923XXXXXXXXX` standard.
* **Message Formats**:
  - **Product Page (`/product/:slug`)**: Prominent "Order on WhatsApp" button with WhatsApp green (`#25D366`). Requires variant selection and sends structured item details: product name, selected variant (size/color), quantity, unit price, total (Free Delivery, COD), absolute image URL, and product page link.
  - **Cart Page (`/cart`)**: "Order via WhatsApp" button under checkout. Lists items (up to 10 with count overflow), subtotal, discount, free delivery, total, and cash on delivery. Positions the primary item image URL near the top for preview generation while maintaining total link length safely under 2000 characters.
  - **Order Confirmation (`/order-success/:orderNumber`)**: "Send Order on WhatsApp" button allowing customers to send complete order summaries (order number, customer name, phone, destination address, items, line totals, and tracking link) to the Karachi dispatch desk. Also accessible via guest tracking (`/track-order`) and customer account order details (`/account/orders/:orderNumber`).
  - **Admin Customer Messaging (`/admin/orders/:id`)**: "Message Customer on WhatsApp" button prefilling order status updates, totals, and greetings addressed to the customer's normalized phone number.
* **Image Preview Limitation & Architecture**:
  - Standard `https://wa.me/` URLs cannot attach raw binary image files directly as parameters.
  - Arooj solves this by converting all image paths to absolute HTTPS URLs (`toAbsoluteUrl`) and placing the primary item image near the top of the message text. WhatsApp clients (mobile and web) automatically generate rich visual link preview cards and thumbnails when the link is tapped or sent.
* **Floating WhatsApp Button**:
  - Persistent bottom-right floating support button on all public storefront pages prefilled with `"Hello Arooj, I need help."`
  - Position is automatically raised on product detail pages (`bottom-20 md:bottom-6`) to prevent overlapping the mobile sticky Add to Cart bar. Automatically suppressed on all `/admin/*` routes.

---

## License

Apache-2.0
