-- Email is no longer collected by the volunteer sign-in form.
-- Keep the legacy columns and data, but allow multiple new rows to store blank values.
DROP INDEX IF EXISTS volunteer_sign_ins_date_email;
