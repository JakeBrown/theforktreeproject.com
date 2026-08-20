CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  preferred_name TEXT NOT NULL,
  is_under_18 INTEGER NOT NULL CHECK (is_under_18 IN (0, 1)),
  date_of_birth TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  referral_sources_json TEXT NOT NULL,
  referral_other TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_phone_normalized TEXT NOT NULL,
  interests_json TEXT NOT NULL,
  interest_other TEXT NOT NULL,
  skills_experience TEXT NOT NULL,
  qualifications_json TEXT NOT NULL,
  licences_json TEXT NOT NULL,
  licence_other TEXT NOT NULL,
  wwcc_status TEXT NOT NULL CHECK (wwcc_status IN ('', 'yes', 'no', 'applied')),
  wwcc_number TEXT NOT NULL,
  wwcc_expiry_date TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (
    frequency IN ('weekly', 'fortnightly', 'monthly', 'occasionally', 'community-planting-days')
  ),
  preferred_days_json TEXT NOT NULL,
  accessibility_support TEXT NOT NULL,
  medical_information TEXT NOT NULL,
  media_consent TEXT NOT NULL CHECK (media_consent IN ('consent', 'decline')),
  declaration_name TEXT NOT NULL,
  agreement_accepted INTEGER NOT NULL CHECK (agreement_accepted = 1),
  form_version TEXT NOT NULL,
  registered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS volunteer_registrations_email
  ON volunteer_registrations (email_normalized);

CREATE INDEX IF NOT EXISTS volunteer_registrations_phone
  ON volunteer_registrations (phone_normalized);

CREATE INDEX IF NOT EXISTS volunteer_registrations_registered_at
  ON volunteer_registrations (registered_at);

CREATE TABLE IF NOT EXISTS volunteer_registration_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);
