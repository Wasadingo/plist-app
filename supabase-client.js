// Cliente Supabase cargado con el SDK estándar del navegador.
window.PListBackend = { enabled: false, client: null };

if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey && window.supabase?.createClient) {
  const client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  window.PListBackend = {
    enabled: true,
    client,
    signUp: (email, password, profile) => client.auth.signUp({ email, password, options: { data: profile, emailRedirectTo: `${location.origin}${location.pathname}` } }),
    signIn: (email, password) => client.auth.signInWithPassword({ email, password }),
    signOut: () => client.auth.signOut(),
    resendSignup: (email) => client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}${location.pathname}` } }),
    session: () => client.auth.getSession(),
    onAuthChange: (callback) => client.auth.onAuthStateChange(callback),
    listLists: () => client.from('shopping_lists').select('*, shopping_items(*)').order('updated_at', { ascending: false }),
    createList: (payload) => client.from('shopping_lists').insert(payload).select().single(),
  };
  document.documentElement.dataset.backend = 'supabase';
  window.dispatchEvent(new CustomEvent('plist-backend-ready'));
} else {
  console.error('PList no ha podido inicializar Supabase. Se mantiene el modo local.');
}
