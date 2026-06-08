-- Migration: 007_orders_tables_whatsapp.sql
-- Align meja status, order statuses, and WhatsApp queue for new orders.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meja_status_check') THEN
    ALTER TABLE meja
      ADD CONSTRAINT meja_status_check
      CHECK (status IN ('tersedia', 'dipakai', 'dibersihkan'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pesanan_status_check') THEN
    ALTER TABLE pesanan
      ADD CONSTRAINT pesanan_status_check
      CHECK (status IN ('menunggu_pembayaran', 'diproses', 'siap', 'selesai', 'dibatalkan'));
  END IF;
END $$;

ALTER TABLE pesanan
  ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(20) DEFAULT 'midtrans';

CREATE TABLE IF NOT EXISTS notifikasi_whatsapp (
  id SERIAL PRIMARY KEY,
  id_pesanan INTEGER REFERENCES pesanan(id) ON DELETE CASCADE,
  tujuan VARCHAR(30),
  pesan TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifikasi_whatsapp_id_pesanan_unique') THEN
    ALTER TABLE notifikasi_whatsapp
      ADD CONSTRAINT notifikasi_whatsapp_id_pesanan_unique UNIQUE (id_pesanan);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION queue_whatsapp_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifikasi_whatsapp (id_pesanan, tujuan, pesan, status, response, created_at)
  VALUES (
    NEW.id,
    NEW.customer_phone,
    'Pesanan baru: #' || NEW.id,
    'pending',
    jsonb_build_object('source', 'trigger', 'order_id', NEW.id),
    NOW()
  )
  ON CONFLICT (id_pesanan)
  DO UPDATE SET
    tujuan = EXCLUDED.tujuan,
    pesan = EXCLUDED.pesan,
    status = EXCLUDED.status,
    response = EXCLUDED.response;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS queue_whatsapp_notification_trigger ON pesanan;
CREATE TRIGGER queue_whatsapp_notification_trigger
  AFTER INSERT ON pesanan
  FOR EACH ROW EXECUTE FUNCTION queue_whatsapp_notification();

CREATE OR REPLACE FUNCTION set_meja_status_from_pesanan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_meja IS NOT NULL AND NEW.tipe_pesanan = 'dine_in' AND NEW.status IN ('menunggu_pembayaran', 'diproses', 'siap') THEN
    UPDATE meja SET status = 'dipakai' WHERE id = NEW.id_meja;
  END IF;

  IF NEW.id_meja IS NOT NULL AND NEW.status IN ('selesai', 'dibatalkan') THEN
    UPDATE meja SET status = 'tersedia' WHERE id = NEW.id_meja;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_meja_status_from_pesanan_trigger ON pesanan;
CREATE TRIGGER set_meja_status_from_pesanan_trigger
  AFTER INSERT OR UPDATE OF status ON pesanan
  FOR EACH ROW EXECUTE FUNCTION set_meja_status_from_pesanan();

NOTIFY pgrst, 'reload schema';
