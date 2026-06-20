-- Migration 012: Add wishlist to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wishlist UUID[] DEFAULT ARRAY[]::UUID[];
