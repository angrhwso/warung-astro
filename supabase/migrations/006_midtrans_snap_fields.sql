-- Migration: 006_midtrans_snap_fields.sql
-- Store Midtrans Snap data for QRIS payment flow.

ALTER TABLE pembayaran
  ADD COLUMN IF NOT EXISTS snap_token TEXT;

ALTER TABLE pembayaran
  ADD COLUMN IF NOT EXISTS redirect_url TEXT;

NOTIFY pgrst, 'reload schema';
