import type { APIRoute } from 'astro';
import { ensureVolunteerSchema, getVolunteerDatabase } from '../../../../lib/volunteerDb';
import { detectImageType, MAX_PHOTO_BYTES, parsePositiveId } from '../../../../lib/volunteerProfiles';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const id = parsePositiveId(params.id);
  const database = getVolunteerDatabase(locals);
  if (!id || !database) return new Response('Not found', { status: 404 });

  await ensureVolunteerSchema(database);
  const photo = await database
    .prepare('SELECT content_type, data FROM volunteer_photos WHERE volunteer_id = ?1')
    .bind(id)
    .first<{ content_type: string; data: ArrayBuffer | number[] }>();
  if (!photo) return new Response('Not found', { status: 404 });

  const body = photo.data instanceof ArrayBuffer ? photo.data : new Uint8Array(photo.data);
  return new Response(body, {
    headers: {
      'content-type': photo.content_type,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'",
    },
  });
};

export const POST: APIRoute = async ({ params, locals, request, redirect }) => {
  const id = parsePositiveId(params.id);
  const database = getVolunteerDatabase(locals);
  if (!id || !database) return new Response('Not found', { status: 404 });
  const back = (notice: string) => redirect(`/admin/volunteers/${id}?notice=${notice}#photo`, 303);

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PHOTO_BYTES + 100_000) return back('photo-too-large');

  await ensureVolunteerSchema(database);
  const volunteer = await database.prepare('SELECT id FROM volunteers WHERE id = ?1').bind(id).first<{ id: number }>();
  if (!volunteer) return new Response('Not found', { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back('photo-invalid');
  }

  if (form.get('action') === 'remove') {
    await database.prepare('DELETE FROM volunteer_photos WHERE volunteer_id = ?1').bind(id).run();
    return back('photo-removed');
  }

  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) return back('photo-missing');
  if (file.size > MAX_PHOTO_BYTES) return back('photo-too-large');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) return back('photo-invalid');

  await database
    .prepare(
      `INSERT INTO volunteer_photos (volunteer_id, content_type, data, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(volunteer_id) DO UPDATE SET content_type = excluded.content_type, data = excluded.data, updated_at = excluded.updated_at`
    )
    .bind(id, contentType, bytes.buffer, new Date().toISOString())
    .run();
  return back('photo-saved');
};
