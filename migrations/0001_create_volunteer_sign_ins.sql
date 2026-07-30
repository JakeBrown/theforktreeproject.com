CREATE TABLE IF NOT EXISTS volunteer_sign_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  volunteer_date TEXT NOT NULL,
  communications_consent INTEGER NOT NULL DEFAULT 0 CHECK (communications_consent IN (0, 1)),
  signed_in_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS volunteer_sign_ins_date_email
  ON volunteer_sign_ins (volunteer_date, email_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS volunteer_sign_ins_date_phone
  ON volunteer_sign_ins (volunteer_date, phone_normalized);

CREATE TABLE IF NOT EXISTS volunteer_sign_in_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);
