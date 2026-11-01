-- Volunteer profiles, photos, sign-out and declaration records, scheduled visits and settings.
-- Every statement is idempotent: the site also applies this schema at runtime (src/lib/volunteerDb.ts),
-- so this file and the runtime schema must stay in sync. Sign-out and declaration data live in
-- volunteer_attendance (keyed by sign-in id), so the existing volunteer_sign_ins table is not altered.

CREATE TABLE IF NOT EXISTS volunteers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  preferred_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone_normalized TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  emergency_contact_name TEXT NOT NULL DEFAULT '',
  emergency_contact_relationship TEXT NOT NULL DEFAULT '',
  emergency_contact_phone TEXT NOT NULL DEFAULT '',
  secondary_emergency_contact_name TEXT NOT NULL DEFAULT '',
  secondary_emergency_contact_relationship TEXT NOT NULL DEFAULT '',
  secondary_emergency_contact_phone TEXT NOT NULL DEFAULT '',
  support_needs TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  registration_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS volunteers_phone ON volunteers (phone_normalized);

CREATE INDEX IF NOT EXISTS volunteers_name ON volunteers (full_name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS volunteer_photos (
  volunteer_id INTEGER PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteer_attendance (
  sign_in_id INTEGER PRIMARY KEY,
  volunteer_id INTEGER,
  declaration_version TEXT NOT NULL DEFAULT '',
  declaration_accepted_at TEXT NOT NULL DEFAULT '',
  signed_out_at TEXT NOT NULL DEFAULT '',
  sign_out_method TEXT NOT NULL DEFAULT '' CHECK (sign_out_method IN ('', 'confirmed', 'automatic'))
);

CREATE INDEX IF NOT EXISTS volunteer_attendance_volunteer ON volunteer_attendance (volunteer_id);

CREATE INDEX IF NOT EXISTS volunteer_attendance_open ON volunteer_attendance (signed_out_at);

CREATE TABLE IF NOT EXISTS volunteer_scheduled_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  volunteer_id INTEGER NOT NULL,
  visit_date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS volunteer_scheduled_visits_date ON volunteer_scheduled_visits (visit_date);

CREATE INDEX IF NOT EXISTS volunteer_scheduled_visits_volunteer ON volunteer_scheduled_visits (volunteer_id);

CREATE TABLE IF NOT EXISTS volunteer_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
