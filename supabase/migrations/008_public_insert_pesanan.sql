-- Migration: 008_public_insert_pesanan.sql
-- Ensure anonymous inserts are allowed for incoming orders.

ALTER TABLE pesanan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert pesanan" ON pesanan;
CREATE POLICY "Public insert pesanan" ON pesanan
  FOR INSERT
  TO anon
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
