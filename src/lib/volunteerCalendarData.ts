import type { SignOutMethod } from './volunteerAttendance.ts';
import {
  buildCalendarEntries,
  type AttendanceRecord,
  type CalendarEntry,
  type CalendarVolunteer,
  type ScheduledVisitRecord,
} from './volunteerCalendar.ts';
import type { D1Database } from './volunteerDb.ts';

interface VolunteerColumns {
  volunteer_id: number | null;
  v_full_name: string | null;
  v_preferred_name: string | null;
  v_phone: string | null;
  v_email: string | null;
  v_ec_name: string | null;
  v_ec_relationship: string | null;
  v_ec_phone: string | null;
  v_ec2_name: string | null;
  v_ec2_relationship: string | null;
  v_ec2_phone: string | null;
}

const VOLUNTEER_SELECT = `v.id AS volunteer_id, v.full_name AS v_full_name, v.preferred_name AS v_preferred_name,
  v.phone AS v_phone, v.email AS v_email,
  v.emergency_contact_name AS v_ec_name, v.emergency_contact_relationship AS v_ec_relationship,
  v.emergency_contact_phone AS v_ec_phone,
  v.secondary_emergency_contact_name AS v_ec2_name, v.secondary_emergency_contact_relationship AS v_ec2_relationship,
  v.secondary_emergency_contact_phone AS v_ec2_phone`;

function volunteerFrom(row: VolunteerColumns, fallbackName = '', fallbackPhone = ''): CalendarVolunteer {
  return {
    id: row.volunteer_id ?? null,
    fullName: row.v_full_name || fallbackName,
    preferredName: row.v_preferred_name || '',
    phone: row.v_phone || fallbackPhone,
    email: row.v_email || '',
    emergencyContactName: row.v_ec_name || '',
    emergencyContactRelationship: row.v_ec_relationship || '',
    emergencyContactPhone: row.v_ec_phone || '',
    secondaryEmergencyContactName: row.v_ec2_name || '',
    secondaryEmergencyContactRelationship: row.v_ec2_relationship || '',
    secondaryEmergencyContactPhone: row.v_ec2_phone || '',
  };
}

interface AttendanceRow extends VolunteerColumns {
  sign_in_id: number;
  volunteer_date: string;
  signed_in_at: string;
  full_name: string;
  phone: string;
  signed_out_at: string | null;
  sign_out_method: SignOutMethod | null;
}

interface VisitRow extends VolunteerColumns {
  visit_id: number;
  visit_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

/** Calendar entries for dates in [startDate, endDate). Call refreshVolunteerRecords first. */
export async function loadCalendarEntries(
  database: D1Database,
  startDate: string,
  endDate: string,
  volunteerId?: number
): Promise<CalendarEntry[]> {
  const volunteerFilter = volunteerId ? ' AND a.volunteer_id = ?3' : '';
  const visitFilter = volunteerId ? ' AND sv.volunteer_id = ?3' : '';
  const bindings: unknown[] = volunteerId ? [startDate, endDate, volunteerId] : [startDate, endDate];

  const [attendanceResult, visitResult] = await Promise.all([
    database
      .prepare(
        `SELECT s.id AS sign_in_id, s.volunteer_date, s.signed_in_at, s.full_name, s.phone,
          a.signed_out_at, a.sign_out_method, ${VOLUNTEER_SELECT}
         FROM volunteer_sign_ins s
         LEFT JOIN volunteer_attendance a ON a.sign_in_id = s.id
         LEFT JOIN volunteers v ON v.id = a.volunteer_id
         WHERE s.volunteer_date >= ?1 AND s.volunteer_date < ?2${volunteerFilter}
         ORDER BY s.volunteer_date ASC, s.signed_in_at ASC
         LIMIT 5000`
      )
      .bind(...bindings)
      .all<AttendanceRow>(),
    database
      .prepare(
        `SELECT sv.id AS visit_id, sv.visit_date, sv.start_time, sv.end_time, sv.notes, ${VOLUNTEER_SELECT}
         FROM volunteer_scheduled_visits sv
         JOIN volunteers v ON v.id = sv.volunteer_id
         WHERE sv.visit_date >= ?1 AND sv.visit_date < ?2${visitFilter}
         ORDER BY sv.visit_date ASC, sv.start_time ASC
         LIMIT 5000`
      )
      .bind(...bindings)
      .all<VisitRow>(),
  ]);

  const attendance: AttendanceRecord[] = (attendanceResult.results || []).map((row) => ({
    signInId: row.sign_in_id,
    date: row.volunteer_date,
    signedInAt: row.signed_in_at,
    signedOutAt: row.signed_out_at || '',
    signOutMethod: (row.sign_out_method || '') as SignOutMethod,
    volunteer: volunteerFrom(row, row.full_name, row.phone),
  }));

  const visits: ScheduledVisitRecord[] = (visitResult.results || []).map((row) => ({
    visitId: row.visit_id,
    date: row.visit_date,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes,
    volunteer: volunteerFrom(row),
  }));

  return buildCalendarEntries(attendance, visits);
}
