# BARVAKA — Supabase (PostgreSQL) Database Setup Guide

This directory contains the production database DDL and initial seeds matching the **05_Backend_Schema** specification.

## Files

1. **`schema.sql`**: Complete PostgreSQL schema definition:
   - Extensions: `uuid-ossp`, `pgcrypto`, `pg_trgm`.
   - Tables: `profiles`, `categories`, `products`, `product_images`, `product_variants`, `coupons`, `orders`, `order_items`, `wishlist_items`.
   - Foreign keys, constraints, and cascade delete rules.
   - Trigram search and query indexes.
   - Triggers: automatic profile creation on user signup (`handle_new_user`), `set_updated_at` automation, and `prevent_role_change` enforcement.
   - RPC Functions:
     - `public.is_admin()`: checks admin status for RLS policies.
     - `public.place_order(...)`: atomic checkout transaction with inventory lock and coupon decrement.
     - `public.get_guest_order(...)`: order lookup strictly by order number and customer phone.
     - `public.validate_coupon(...)`: cart coupon validation without exposing coupon records.
     - `public.update_order_status(...)`: order status transition with automatic stock restoration on cancellation.
     - `public.admin_dashboard_stats(...)`: sales metrics, order counts, and daily timeline generation.
   - Row Level Security (RLS) policies on all tables.
   - Storage bucket configuration (`product-images` with 2 MB limit, image MIME check, public read, admin write).

2. **`seed.sql`**: Safe seed data (`ON CONFLICT DO NOTHING`) containing:
   - 6 curated product categories (Men's Apparel, Women's Collection, Fragrances, Electronics, Leather, Home & Living).
   - Sample products with high-resolution imagery and multi-size/color variants.
   - Inaugural launch coupon (`WELCOME10` for 10% off on orders above Rs. 2,000).

## How to Apply

### In Supabase Dashboard
1. Open your Supabase Project.
2. Go to the **SQL Editor** tab.
3. Paste and run `supabase/schema.sql`.
4. (Optional) Run `supabase/seed.sql` if you want initial catalog items populated.

### Promoting the First Admin
After signing up via the website, promote your email to store owner in the SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```
