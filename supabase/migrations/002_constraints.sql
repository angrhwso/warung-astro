-- Migration: 002_constraints.sql
-- Add constraints, ON DELETE behavior, indexes, and permissive policies for this single-admin app.

ALTER TABLE IF EXISTS pesanan
  DROP CONSTRAINT IF EXISTS pesanan_id_meja_fkey;

ALTER TABLE IF EXISTS pesanan
  ALTER COLUMN id_meja DROP NOT NULL;

ALTER TABLE IF EXISTS pesanan
  ADD CONSTRAINT pesanan_id_meja_fkey FOREIGN KEY (id_meja) REFERENCES meja(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pesanan_tipe_check') THEN
    ALTER TABLE pesanan ADD CONSTRAINT pesanan_tipe_check CHECK (tipe_pesanan IN ('dine_in','takeaway','delivery'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pesanan_status_check') THEN
    ALTER TABLE pesanan ADD CONSTRAINT pesanan_status_check CHECK (status IN ('menunggu_pembayaran','diproses','siap','selesai','dibatalkan'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pembayaran_metode_check') THEN
    ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_metode_check CHECK (metode IN ('qris','tunai'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pembayaran_status_check') THEN
    ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_status_check CHECK (status IN ('pending','paid','failed','refunded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pesanan_status_created_at ON pesanan(status, created_at);
CREATE INDEX IF NOT EXISTS idx_menu_kategori ON menu(id_kategori);
CREATE INDEX IF NOT EXISTS idx_pembayaran_id_pesanan ON pembayaran(id_pesanan);
CREATE INDEX IF NOT EXISTS idx_log_stok_created_at ON log_stok(created_at);
CREATE INDEX IF NOT EXISTS idx_log_menu_created_at ON log_menu(created_at);

ALTER TABLE meja ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read meja" ON meja;
DROP POLICY IF EXISTS "public read kategori" ON kategori;
DROP POLICY IF EXISTS "public read menu" ON menu;
DROP POLICY IF EXISTS "public create pesanan" ON pesanan;
DROP POLICY IF EXISTS "public read own-ish pesanan" ON pesanan;
DROP POLICY IF EXISTS "public create detail" ON detail_pesanan;
DROP POLICY IF EXISTS "public read detail" ON detail_pesanan;
DROP POLICY IF EXISTS "public read pembayaran" ON pembayaran;
DROP POLICY IF EXISTS "authenticated manage meja" ON meja;
DROP POLICY IF EXISTS "authenticated manage kategori" ON kategori;
DROP POLICY IF EXISTS "authenticated manage menu" ON menu;
DROP POLICY IF EXISTS "authenticated manage pesanan" ON pesanan;
DROP POLICY IF EXISTS "authenticated manage detail" ON detail_pesanan;
DROP POLICY IF EXISTS "authenticated manage pembayaran" ON pembayaran;
DROP POLICY IF EXISTS "authenticated read log stok" ON log_stok;
DROP POLICY IF EXISTS "authenticated read log menu" ON log_menu;
DROP POLICY IF EXISTS "authenticated manage log stok" ON log_stok;
DROP POLICY IF EXISTS "authenticated manage log menu" ON log_menu;

CREATE POLICY "public read meja" ON meja FOR SELECT USING (true);
CREATE POLICY "public read kategori" ON kategori FOR SELECT USING (true);
CREATE POLICY "public read menu" ON menu FOR SELECT USING (true);
CREATE POLICY "public create pesanan" ON pesanan FOR INSERT WITH CHECK (true);
CREATE POLICY "public read own-ish pesanan" ON pesanan FOR SELECT USING (true);
CREATE POLICY "public create detail" ON detail_pesanan FOR INSERT WITH CHECK (true);
CREATE POLICY "public read detail" ON detail_pesanan FOR SELECT USING (true);
CREATE POLICY "public read pembayaran" ON pembayaran FOR SELECT USING (true);

CREATE POLICY "authenticated manage meja" ON meja FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage kategori" ON kategori FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage menu" ON menu FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage pesanan" ON pesanan FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage detail" ON detail_pesanan FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage pembayaran" ON pembayaran FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage log stok" ON log_stok FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated manage log menu" ON log_menu FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
