import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const readSecret = (name: string) => (Deno.env.get(name) || '').trim().replace(/^['"]|['"]$/g, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const anonKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoKey = readSecret('BREVO_API_KEY');
    const recipient = readSecret('FEEDBACK_RECIPIENT_EMAIL');
    const sender = readSecret('FEEDBACK_SENDER_EMAIL');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !brevoKey || !recipient || !sender) throw new Error('Faltan secretos o claves de feedback en la Edge Function');

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const payload = await request.json();
    const contactEmail = String(payload.contactEmail || '').trim();
    const category = String(payload.category || 'other');
    const message = String(payload.message || '').trim();
    if (!contactEmail.includes('@') || message.length < 10 || message.length > 2000) throw new Error('Datos de feedback no válidos');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: insertError } = await adminClient.from('feedback').insert({ user_id: user.id, contact_email: contactEmail, category, message });
    if (insertError) throw insertError;

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': brevoKey, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { email: sender, name: 'PList' }, to: [{ email: recipient }], replyTo: { email: contactEmail }, subject: `[PList] Nuevo ${category}`, textContent: `Usuario: ${contactEmail}\nCategoría: ${category}\n\n${message}` }),
    });
    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      throw new Error(`Brevo respondió con ${emailResponse.status}: ${details.slice(0, 500)}`);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('send-feedback failed', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo enviar el feedback' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
