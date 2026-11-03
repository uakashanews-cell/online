-- ==============================================================================
-- BARVAKA E-Commerce — Supabase (PostgreSQL) Initial Seed Script
-- Source of Truth: 05_Backend_Schema (Section 7)
-- Safe: Uses ON CONFLICT DO NOTHING so it never overwrites existing records.
-- ==============================================================================

-- 1. Initial Categories
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Men''s Apparel', 'mens-apparel', 'Traditional kurtas, formal shirts, chinos & waistcoats crafted for comfort.', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Women''s Collection', 'womens-collection', 'Designer lawn, embroidered khaddar, festive kurtis and luxury shawls.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'Fragrances & Pure Attar', 'fragrances-attar', 'Long-lasting oriental attar oils, pure dehn al oudh, and artisan perfumes.', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Electronics & Gadgets', 'electronics-gadgets', 'Verified wireless earbuds, smart watches, power banks with nationwide warranty.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', 4, true),
  ('c0000000-0000-0000-0000-000000000005', 'Leather & Accessories', 'leather-accessories', 'Handcrafted genuine leather wallets, belts, duffles & everyday travel essentials.', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80', 5, true),
  ('c0000000-0000-0000-0000-000000000006', 'Home & Living', 'home-living', 'Premium cotton bed sets, artisan prayer rugs, and brass incense burners.', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Sample Products
INSERT INTO public.products (id, category_id, name, slug, description, base_price, compare_at_price, image_url, is_featured, is_active)
VALUES
  (
    'p0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Royal Embroidered Cotton Kurta',
    'royal-embroidered-cotton-kurta',
    'Tailored from breathable 100% combed Egyptian cotton. Features delicate thread embroidery on collar and placket with classic mother-of-pearl buttons. Ideal for Friday prayers, family gatherings, and everyday elegance.',
    3450.00,
    4500.00,
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80',
    true,
    true
  ),
  (
    'p0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    '3-Piece Stitched Digital Lawn Suit with Chiffon Dupatta',
    'stitched-digital-lawn-suit-chiffon-dupatta',
    'A complete 3-piece luxury ensemble comprising an intricate digital printed lawn shirt, dyed cambric trousers, and a lightweight crinkle chiffon dupatta.',
    5950.00,
    7500.00,
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- 3. Product Images
INSERT INTO public.product_images (id, product_id, image_url, sort_order)
VALUES
  ('i0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80', 1),
  ('i0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80', 2),
  ('i0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80', 1),
  ('i0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80', 2)
ON CONFLICT DO NOTHING;

-- 4. Product Variants
INSERT INTO public.product_variants (id, product_id, sku, size, color, color_hex, price, stock_quantity, is_active)
VALUES
  ('v0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'BRV-KRT-WHT-S', 'S', 'Pure White', '#FAFAFA', NULL, 12, true),
  ('v0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001', 'BRV-KRT-WHT-M', 'M', 'Pure White', '#FAFAFA', NULL, 24, true),
  ('v0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001', 'BRV-KRT-WHT-L', 'L', 'Pure White', '#FAFAFA', NULL, 18, true),
  ('v0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000001', 'BRV-KRT-NVY-M', 'M', 'Navy Blue', '#1A2E40', NULL, 8, true),
  ('v0000000-0000-0000-0000-000000000005', 'p0000000-0000-0000-0000-000000000002', 'BRV-LWN-ROSE-M', 'M', 'Rose Bloom', '#C06C84', NULL, 14, true),
  ('v0000000-0000-0000-0000-000000000006', 'p0000000-0000-0000-0000-000000000002', 'BRV-LWN-ROSE-L', 'L', 'Rose Bloom', '#C06C84', NULL, 4, true)
ON CONFLICT (sku) DO NOTHING;

-- 5. Welcome Coupon
INSERT INTO public.coupons (id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, starts_at, expires_at, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'WELCOME10', 'percentage', 10.00, 2000.00, 500, 0, now() - interval '1 day', now() + interval '365 days', true)
ON CONFLICT (code) DO NOTHING;
