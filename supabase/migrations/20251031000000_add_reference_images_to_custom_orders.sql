-- Add reference_image_urls column to custom_orders for storing optional reference images
ALTER TABLE public.custom_orders
ADD COLUMN IF NOT EXISTS reference_image_urls TEXT[];



