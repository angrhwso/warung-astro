-- Migration: 003_fix_admin_menu_meja.sql
-- Run this if admin cannot add menu/table after deploying.
-- It repairs old trigger functions and makes realtime/policies idempotent.

ALTER TABLE meja ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE meja ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'tersedia';

ALTER TABLE kategori ADD COLUMN IF NOT EXISTS urutan INTEGER DEFAULT 0;

ALTER TABLE menu ADD COLUMN IF NOT EXISTS deskripsi TEXT;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS stok INTEGER DEFAULT 0;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS gambar_url TEXT;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS id_kategori INTEGER REFERENCES kategori(id);
ALTER TABLE menu ADD COLUMN IF NOT EXISTS tersedia BOOLEAN DEFAULT true;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE OR REPLACE FUNCTION log_menu_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO log_menu (aksi, id_menu, data_lama, data_baru, created_at)
    VALUES ('insert', NEW.id, NULL, to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO log_menu (aksi, id_menu, data_lama, data_baru, created_at)
    VALUES ('update', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO log_menu (aksi, id_menu, data_lama, data_baru, created_at)
    VALUES ('delete', OLD.id, to_jsonb(OLD), NULL, NOW());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_menu_change_trigger ON menu;
CREATE TRIGGER log_menu_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON menu
  FOR EACH ROW EXECUTE FUNCTION log_menu_change();

CREATE OR REPLACE FUNCTION log_stok_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stok IS DISTINCT FROM NEW.stok THEN
    INSERT INTO log_stok (id_menu, perubahan, alasan)
    VALUES (
      NEW.id,
      NEW.stok - OLD.stok,
      COALESCE(current_setting('app.stok_reason', true), 'manual_update')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_stok_change_trigger ON menu;
CREATE TRIGGER log_stok_change_trigger
  AFTER UPDATE OF stok ON menu
  FOR EACH ROW EXECUTE FUNCTION log_stok_change();

CREATE OR REPLACE FUNCTION decrease_stock_on_processed()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'diproses' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR r IN SELECT * FROM detail_pesanan WHERE id_pesanan = NEW.id LOOP
      PERFORM set_config('app.stok_reason', 'auto_decrease_on_processed', true);
      UPDATE menu SET stok = GREATEST(0, stok - r.jumlah) WHERE id = r.id_menu;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decrease_stock_on_processed_trigger ON pesanan;
CREATE TRIGGER decrease_stock_on_processed_trigger
  AFTER UPDATE OF status ON pesanan
  FOR EACH ROW EXECUTE FUNCTION decrease_stock_on_processed();

CREATE UNIQUE INDEX IF NOT EXISTS idx_kategori_nama_unique ON kategori(nama);

INSERT INTO kategori (nama, urutan)
VALUES ('Makanan', 1), ('Minuman', 2)
ON CONFLICT (nama) DO NOTHING;

DROP POLICY IF EXISTS "authenticated manage meja" ON meja;
DROP POLICY IF EXISTS "authenticated manage menu" ON menu;
DROP POLICY IF EXISTS "authenticated manage log stok" ON log_stok;
DROP POLICY IF EXISTS "authenticated manage log menu" ON log_menu;

CREATE POLICY "authenticated manage meja" ON meja
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated manage menu" ON menu
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated manage log stok" ON log_stok
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated manage log menu" ON log_menu
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
