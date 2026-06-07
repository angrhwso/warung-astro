-- Migration: 001_init.sql
-- Creates initial schema for warung-astro

-- meja
CREATE TABLE IF NOT EXISTS meja (
  id SERIAL PRIMARY KEY,
  nomor_meja INTEGER UNIQUE NOT NULL,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'tersedia'
);

-- kategori
CREATE TABLE IF NOT EXISTS kategori (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(50) NOT NULL,
  urutan INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kategori_nama_unique ON kategori(nama);

-- menu
CREATE TABLE IF NOT EXISTS menu (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  harga INTEGER NOT NULL,
  stok INTEGER DEFAULT 0,
  gambar_url TEXT,
  id_kategori INTEGER REFERENCES kategori(id),
  tersedia BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- pesanan
CREATE TABLE IF NOT EXISTS pesanan (
  id SERIAL PRIMARY KEY,
  id_meja INTEGER REFERENCES meja(id),
  tipe_pesanan VARCHAR(20) NOT NULL,
  alamat_delivery TEXT,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  status VARCHAR(30) DEFAULT 'menunggu_pembayaran',
  subtotal INTEGER NOT NULL,
  pajak INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- detail_pesanan
CREATE TABLE IF NOT EXISTS detail_pesanan (
  id SERIAL PRIMARY KEY,
  id_pesanan INTEGER REFERENCES pesanan(id) ON DELETE CASCADE,
  id_menu INTEGER REFERENCES menu(id),
  jumlah INTEGER NOT NULL,
  harga_saat_pesan INTEGER NOT NULL,
  catatan_item TEXT
);

-- pembayaran
CREATE TABLE IF NOT EXISTS pembayaran (
  id SERIAL PRIMARY KEY,
  id_pesanan INTEGER REFERENCES pesanan(id) UNIQUE,
  metode VARCHAR(20) DEFAULT 'qris',
  transaction_id VARCHAR(100),
  payment_link TEXT,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- log_stok
CREATE TABLE IF NOT EXISTS log_stok (
  id SERIAL PRIMARY KEY,
  id_menu INTEGER REFERENCES menu(id),
  perubahan INTEGER,
  alasan VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- log_menu
CREATE TABLE IF NOT EXISTS log_menu (
  id SERIAL PRIMARY KEY,
  aksi VARCHAR(20),
  id_menu INTEGER,
  data_lama JSONB,
  data_baru JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pesanan_updated_at ON pesanan;
CREATE TRIGGER update_pesanan_updated_at
  BEFORE UPDATE ON pesanan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: log_stok_change
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
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS log_stok_change_trigger ON menu;
CREATE TRIGGER log_stok_change_trigger
  AFTER UPDATE OF stok ON menu
  FOR EACH ROW EXECUTE FUNCTION log_stok_change();

-- Function: log_menu_change for inserts/updates/deletes
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
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS log_menu_change_trigger ON menu;
CREATE TRIGGER log_menu_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON menu
  FOR EACH ROW EXECUTE FUNCTION log_menu_change();

-- Function: decrease_stock_on_processed
-- When pesanan.status changes to 'diproses', decrease menu.stok accordingly
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
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS decrease_stock_on_processed_trigger ON pesanan;
CREATE TRIGGER decrease_stock_on_processed_trigger
  AFTER UPDATE OF status ON pesanan
  FOR EACH ROW EXECUTE FUNCTION decrease_stock_on_processed();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pesanan_status_created_at ON pesanan(status, created_at);
CREATE INDEX IF NOT EXISTS idx_menu_kategori ON menu(id_kategori);

INSERT INTO kategori (nama, urutan)
VALUES ('Makanan', 1), ('Minuman', 2)
ON CONFLICT (nama) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'pesanan'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pesanan;
  END IF;
END $$;
