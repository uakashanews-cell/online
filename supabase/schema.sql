-- ==============================================================================
-- BARVAKA E-Commerce — Supabase (PostgreSQL) Production Schema
-- Source of Truth: 05_Backend_Schema
-- ==============================================================================

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------------------------

-- 1.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;


-- 1.3 products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  base_price numeric(12,2) NOT NULL CHECK (base_price >= 0),
  compare_at_price numeric(12,2),
  image_url text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.4 product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 1.5 product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text UNIQUE,
  size text,
  color text,
  color_hex text,
  price numeric(12,2),
  stock_quantity int NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 1.6 coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0 AND (discount_type != 'percentage' OR discount_value <= 100)),
  min_order_amount numeric(12,2) DEFAULT 0,
  max_uses int,
  used_count int DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 1.7 orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address text NOT NULL,
  city text NOT NULL,
  province text,
  postal_code text,
  notes text,
  subtotal numeric(12,2) NOT NULL,
  discount_amount numeric(12,2) DEFAULT 0,
  delivery_fee numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code text,
  payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method = 'cod'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.8 order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text,
  image_url text,
  unit_price numeric(12,2) NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL
);

-- 1.9 wishlist_items
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id)
);

-- ------------------------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_desc ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON public.product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_desc ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 3. Helper Functions & Triggers
-- ------------------------------------------------------------------------------

-- 3.0 is_admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 3.1 set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.2 handle_new_user trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'customer',
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.3 prevent_role_change trigger
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- 3.4 validate_coupon RPC (safe preview for Cart)
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_discount numeric := 0;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon code is required');
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(code) = upper(trim(p_code)) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'message', 'Invalid or inactive coupon code');
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'message', 'This coupon is not active yet');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'message', 'This coupon has expired');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'message', 'This coupon has reached its maximum usage limit');
  END IF;

  IF p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'discount_amount', 0,
      'message', format('Minimum order amount of Rs. %s required for this coupon', v_coupon.min_order_amount)
    );
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := round((p_subtotal * (v_coupon.discount_value / 100.0)), 2);
  ELSE
    v_discount := least(v_coupon.discount_value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount
  );
END;
$$;

-- 3.5 place_order RPC (Atomic Checkout Transaction)
CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_shipping_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_date_prefix text := to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYMMDD');
  v_rand_suffix text := upper(substring(md5(random()::text) from 1 for 4));
  v_order_number text := 'BRV-' || v_date_prefix || '-' || v_rand_suffix;
  v_item record;
  v_variant record;
  v_product record;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_delivery_fee numeric(12,2) := 0;
  v_total numeric(12,2);
  v_coupon record;
  v_coupon_id uuid := NULL;
  v_coupon_code text := NULL;
  v_item_count int := 0;
BEGIN
  -- 1. Validate required fields
  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer full name is required';
  END IF;
  IF p_customer_phone IS NULL OR trim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Customer phone number is required';
  END IF;
  IF p_shipping_address IS NULL OR trim(p_shipping_address) = '' THEN
    RAISE EXCEPTION 'Shipping delivery address is required';
  END IF;
  IF p_city IS NULL OR trim(p_city) = '' THEN
    RAISE EXCEPTION 'City name is required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. Please select products to place an order.';
  END IF;

  -- Ensure unique order number
  WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
    v_rand_suffix := upper(substring(md5(random()::text) from 1 for 4));
    v_order_number := 'BRV-' || v_date_prefix || '-' || v_rand_suffix;
  END LOOP;

  -- 2. Validate items, calculate line totals, check stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(variant_id uuid, quantity int) LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero';
    END IF;

    -- Lock variant row for concurrency
    SELECT * INTO v_variant
    FROM public.product_variants
    WHERE id = v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variant not found (ID: %)', v_item.variant_id;
    END IF;

    IF NOT v_variant.is_active THEN
      RAISE EXCEPTION 'Selected product variant is no longer active';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_variant.product_id;

    IF NOT FOUND OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is no longer available', coalesce(v_product.name, 'Unknown');
    END IF;

    IF v_variant.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for % (%). Available: %, Requested: %',
        v_product.name,
        coalesce(trim(concat_ws(' / ', v_variant.size, v_variant.color)), 'Standard'),
        v_variant.stock_quantity,
        v_item.quantity;
    END IF;

    v_unit_price := coalesce(v_variant.price, v_product.base_price);
    v_line_total := v_unit_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_item_count := v_item_count + 1;
  END LOOP;

  -- 3. Validate coupon if provided
  IF p_coupon_code IS NULL OR trim(p_coupon_code) = '' THEN
    v_discount := 0;
  ELSE
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code: %', p_coupon_code;
    END IF;

    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
      RAISE EXCEPTION 'Coupon "%" is not yet active', v_coupon.code;
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon "%" has expired', v_coupon.code;
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon "%" has reached its maximum usage limit', v_coupon.code;
    END IF;

    IF v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'Coupon "%" requires a minimum order of Rs. %', v_coupon.code, v_coupon.min_order_amount;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := round((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
    ELSE
      v_discount := least(v_coupon.discount_value, v_subtotal);
    END IF;

    v_coupon_id := v_coupon.id;
    v_coupon_code := v_coupon.code;

    -- Increment coupon usage
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon.id;
  END IF;

  v_delivery_fee := 0; -- Always 0 free delivery nationwide in Pakistan
  v_total := greatest(0, v_subtotal - v_discount + v_delivery_fee);

  -- 4. Insert order
  INSERT INTO public.orders (
    id,
    order_number,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    city,
    province,
    postal_code,
    notes,
    subtotal,
    discount_amount,
    delivery_fee,
    total,
    coupon_id,
    coupon_code,
    payment_method,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    auth.uid(),
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(p_customer_email), ''),
    trim(p_shipping_address),
    trim(p_city),
    coalesce(trim(p_province), 'Pakistan'),
    nullif(trim(p_postal_code), ''),
    nullif(trim(p_notes), ''),
    v_subtotal,
    v_discount,
    v_delivery_fee,
    v_total,
    v_coupon_id,
    v_coupon_code,
    'cod',
    'pending',
    now(),
    now()
  );

  -- 5. Insert order items & decrement stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(variant_id uuid, quantity int) LOOP
    SELECT v.*, p.name AS product_name, p.image_url AS product_image
    INTO v_variant
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    WHERE v.id = v_item.variant_id;

    v_unit_price := coalesce(v_variant.price, (SELECT base_price FROM public.products WHERE id = v_variant.product_id));
    v_line_total := v_unit_price * v_item.quantity;

    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      variant_id,
      product_name,
      variant_label,
      image_url,
      unit_price,
      quantity,
      line_total
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      v_variant.product_id,
      v_variant.id,
      v_variant.product_name,
      trim(concat_ws(' / ', v_variant.size, v_variant.color)),
      coalesce(v_variant.product_image, ''),
      v_unit_price,
      v_item.quantity,
      v_line_total
    );

    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_variant.id;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$$;

-- 3.6 get_guest_order RPC
CREATE OR REPLACE FUNCTION public.get_guest_order(
  p_order_number text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items jsonb;
  v_clean_phone text := regexp_replace(p_phone, '[^0-9]', '', 'g');
BEGIN
  IF p_order_number IS NULL OR trim(p_order_number) = '' OR p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE upper(order_number) = upper(trim(p_order_number))
    AND right(regexp_replace(customer_phone, '[^0-9]', '', 'g'), 10) = right(v_clean_phone, 10)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'user_id', v_order.user_id,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'customer_email', v_order.customer_email,
    'shipping_address', v_order.shipping_address,
    'city', v_order.city,
    'province', v_order.province,
    'postal_code', v_order.postal_code,
    'notes', v_order.notes,
    'order_notes', v_order.notes,
    'subtotal', v_order.subtotal,
    'discount_amount', v_order.discount_amount,
    'delivery_fee', v_order.delivery_fee,
    'total', v_order.total,
    'coupon_code', v_order.coupon_code,
    'payment_method', v_order.payment_method,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items
  );
END;
$$;

-- 3.7 update_order_status RPC (Admin only, restores stock on cancellation)
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text);
DROP FUNCTION IF EXISTS public.update_order_status(text, text);

CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_item record;
  v_target_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', p_status;
  END IF;

  SELECT id, status INTO v_target_id, v_old_status
  FROM public.orders
  WHERE id::text = trim(p_order_id)
     OR upper(order_number) = upper(trim(p_order_id))
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found (ID: %)', p_order_id;
  END IF;

  -- Restore stock quantities if status is changed to cancelled
  IF p_status = 'cancelled' AND v_old_status <> 'cancelled' THEN
    FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = v_target_id LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.variant_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = p_status,
      payment_status = CASE WHEN p_status = 'delivered' THEN 'paid' ELSE payment_status END,
      updated_at = now()
  WHERE id = v_target_id;
END;
$$;

-- UUID signature overload
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_order_status(p_order_id::text, p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_status(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO anon, authenticated, service_role;


-- 3.8 admin_dashboard_stats RPC
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sales numeric(12,2) := 0;
  v_total_orders int := 0;
  v_pending_orders int := 0;
  v_customers_count int := 0;
  v_chart_data jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  SELECT coalesce(sum(total), 0) INTO v_total_sales
  FROM public.orders
  WHERE status <> 'cancelled';

  SELECT count(*) INTO v_total_orders FROM public.orders;
  SELECT count(*) INTO v_pending_orders FROM public.orders WHERE status = 'pending';
  SELECT count(*) INTO v_customers_count FROM public.profiles WHERE role = 'customer';

  WITH dates AS (
    SELECT generate_series(
      (current_date - (p_days - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date AS day
  ),
  day_stats AS (
    SELECT
      d.day,
      to_char(d.day, 'YYYY-MM-DD') AS date_str,
      to_char(d.day, 'Dy, Mon DD') AS label,
      coalesce(sum(o.total), 0) AS total,
      count(o.id) AS count
    FROM dates d
    LEFT JOIN public.orders o
      ON (o.created_at AT TIME ZONE 'Asia/Karachi')::date = d.day
      AND o.status <> 'cancelled'
    GROUP BY d.day
    ORDER BY d.day ASC
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'date', date_str,
      'label', label,
      'total', total,
      'count', count
    )
  ), '[]'::jsonb) INTO v_chart_data
  FROM day_stats;

  RETURN jsonb_build_object(
    'totalSales', v_total_sales,
    'totalOrders', v_total_orders,
    'pendingOrders', v_pending_orders,
    'customersCount', v_customers_count,
    'chartData', v_chart_data
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- categories
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- products
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_images
DROP POLICY IF EXISTS "product_images_public_read" ON public.product_images;
CREATE POLICY "product_images_public_read"
  ON public.product_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.is_active = true OR public.is_admin()))
  );

DROP POLICY IF EXISTS "product_images_admin_all" ON public.product_images;
CREATE POLICY "product_images_admin_all"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_variants
DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read"
  ON public.product_variants FOR SELECT
  USING (
    (is_active = true AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all"
  ON public.product_variants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- coupons (No public/customer direct table select; validated exclusively through RPCs)
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- orders
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
CREATE POLICY "orders_customer_select"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- order_items
DROP POLICY IF EXISTS "order_items_customer_select" ON public.order_items;
CREATE POLICY "order_items_customer_select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- wishlist_items
DROP POLICY IF EXISTS "wishlist_items_user_select" ON public.wishlist_items;
CREATE POLICY "wishlist_items_user_select"
  ON public.wishlist_items FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "wishlist_items_user_insert" ON public.wishlist_items;
CREATE POLICY "wishlist_items_user_insert"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlist_items_user_delete" ON public.wishlist_items;
CREATE POLICY "wishlist_items_user_delete"
  ON public.wishlist_items FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. Storage Buckets & Policies
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Public read access
DROP POLICY IF EXISTS "Public Read product-images" ON storage.objects;
CREATE POLICY "Public Read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Admin write access
DROP POLICY IF EXISTS "Admin Insert product-images" ON storage.objects;
CREATE POLICY "Admin Insert product-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admin Update product-images" ON storage.objects;
CREATE POLICY "Admin Update product-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admin Delete product-images" ON storage.objects;
CREATE POLICY "Admin Delete product-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- ============================================================================
-- 9. HOME HERO BANNER TABLE & POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.home_banner (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_active boolean NOT NULL DEFAULT true,
  label text,
  headline text NOT NULL,
  subtext text,
  button_text text NOT NULL DEFAULT 'Explore the shop',
  button_link text NOT NULL DEFAULT '/shop',
  image_url text,
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_banner ENABLE ROW LEVEL SECURITY;

-- Public can read only an active, non-expired banner
DROP POLICY IF EXISTS "Public can view active non-expired banner" ON public.home_banner;
CREATE POLICY "Public can view active non-expired banner"
  ON public.home_banner FOR SELECT
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- Admin can read all banner states (including inactive/expired)
DROP POLICY IF EXISTS "Admins can view all banner states" ON public.home_banner;
CREATE POLICY "Admins can view all banner states"
  ON public.home_banner FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin can insert / update banner
DROP POLICY IF EXISTS "Admins can insert banner" ON public.home_banner;
CREATE POLICY "Admins can insert banner"
  ON public.home_banner FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update banner" ON public.home_banner;
CREATE POLICY "Admins can update banner"
  ON public.home_banner FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant access
GRANT SELECT ON public.home_banner TO anon, authenticated;
GRANT ALL ON public.home_banner TO authenticated;

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_home_banner_updated_at ON public.home_banner;
CREATE TRIGGER trg_home_banner_updated_at
  BEFORE UPDATE ON public.home_banner
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Initial seed row (id = 1)
INSERT INTO public.home_banner (id, is_active, label, headline, subtext, button_text, button_link)
VALUES (
  1,
  true,
  'New',
  'Welcome to Arooj',
  'Free delivery on all orders. Pay on arrival.',
  'Shop now',
  '/shop'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. SITE SETTINGS TABLE & POLICIES (Key-Value JSONB Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (anon and authenticated) can view settings
DROP POLICY IF EXISTS "Anyone can view site_settings" ON public.site_settings;
CREATE POLICY "Anyone can view site_settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can INSERT / UPDATE / DELETE settings
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete site_settings" ON public.site_settings;
CREATE POLICY "Admins can delete site_settings"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Grant table access
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated;

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Initial seed row for home_hero_banner
INSERT INTO public.site_settings (key, value)
VALUES (
  'home_hero_banner',
  jsonb_build_object(
    'id', 1,
    'is_active', true,
    'label', 'New',
    'headline', 'Welcome to Arooj',
    'subtext', 'Free delivery on all orders. Pay on arrival.',
    'button_text', 'Shop now',
    'button_link', '/shop',
    'image_url', null,
    'ends_at', null,
    'updated_at', now()
  )
)
ON CONFLICT (key) DO NOTHING;

-- Fix existing saved rows: update headline to 'Welcome to Arooj' if it contains 'BARVAKA'
UPDATE public.site_settings
SET value = jsonb_set(value, '{headline}', '"Welcome to Arooj"')
WHERE key = 'home_hero_banner'
  AND (value->>'headline' ILIKE '%BARVAKA%');

-- Also fix legacy home_banner table if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'home_banner'
  ) THEN
    UPDATE public.home_banner
    SET headline = 'Welcome to Arooj'
    WHERE headline ILIKE '%BARVAKA%';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

