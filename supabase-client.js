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
    updateList: (id, payload) => client.from('shopping_lists').update(payload).eq('id', id).select().single(),
    deleteList: (id) => client.from('shopping_lists').delete().eq('id', id),
    createItem: (payload) => client.from('shopping_items').insert(payload).select().single(),
    updateItem: (id, payload) => client.from('shopping_items').update(payload).eq('id', id).select().single(),
    deleteItem: (id) => client.from('shopping_items').delete().eq('id', id),
    inviteToList: (listId, nickname) => client.rpc('create_list_invitation', { target_list: listId, target_nickname: nickname }),
    respondToInvitation: (invitationId, decision) => client.rpc('respond_list_invitation', { target_invitation: invitationId, decision }),
    notifications: () => client.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }),
    markNotificationRead: (id) => client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id),
    adminStatus: () => client.rpc('admin_status'),
    setAdminPin: (pin) => client.rpc('set_admin_pin', { new_pin: pin }),
    verifyAdminPin: (pin) => client.rpc('verify_admin_pin', { candidate_pin: pin }),
    adminDeleteRecipe: (sessionId, recipeId) => client.rpc('admin_delete_recipe', { target_session: sessionId, target_recipe: recipeId }),
    adminDeleteComment: (sessionId, commentId) => client.rpc('admin_delete_comment', { target_session: sessionId, target_comment: commentId }),
    sendFeedback: async (payload) => { const result = await client.functions.invoke('send-feedback', { body: payload }); const context = result.error?.context; if (context && typeof context.json === 'function') { try { const details = await context.json(); return { data: details, error: new Error(details.error || result.error.message) }; } catch (_) {} } return result; },
    invitations: () => client.from('list_invitations').select('id,list_id,inviter_id,invitee_id,status,created_at,shopping_lists(name)').eq('status', 'pending'),
  };
  document.documentElement.dataset.backend = 'supabase';
  window.dispatchEvent(new CustomEvent('plist-backend-ready'));
} else {
  console.error('PList no ha podido inicializar Supabase. Se mantiene el modo local.');
}
