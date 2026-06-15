CREATE TABLE IF NOT EXISTS customer_sessions (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  otp_code VARCHAR(6),
  otp_expires_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT false,
  session_token TEXT,
  session_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_customer_sessions_updated_at ON customer_sessions;
CREATE TRIGGER update_customer_sessions_updated_at
  BEFORE UPDATE ON customer_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
