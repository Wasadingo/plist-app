import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const env = (name: string) => (Deno.env.get(name) || '').trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = env('SUPABASE_URL');
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
const webhookSecret = env('PUSH_WEBHOOK_SECRET');
const vapidPublicKey = env('VAPID_PUBLIC_KEY');
const vapidPrivateKey = env('VAPID_PRIVATE_KEY');
const vapidSubject = env('VAPID_SUBJECT') || 'mailto:periche1995@gmail.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (webhookSecret && request.headers.get('x-webhook-secret') !== webhookSecret) return json({ error: 'No autorizado' }, 401);
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) return json({ error: 'Faltan secretos de Web Push en Supabase' }, 500);

  const payload = await request.json().catch(() => null);
  const notification = payload?.record || payload?.data?.record || payload;
  if (!notification?.user_id || !notification?.title) return json({ error: 'Payload de notificación no válido' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', notification.user_id);
  if (error) return json({ error: error.message }, 500);

  const message = JSON.stringify({
    title: notification.title,
    body: notification.body || 'Tienes una novedad en PList.',
    url: './?view=home',
  });
  const results = await Promise.all((subscriptions || []).map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, message);
      return { sent: true };
    } catch (sendError) {
      const statusCode = Number((sendError as { statusCode?: number })?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      return { sent: false, statusCode };
    }
  }));

  return json({ sent: results.filter(result => result.sent).length, subscriptions: results.length });
});
