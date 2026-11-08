const state = {
  view: 'home',
  mode: 'normal',
  user: null,
  notifications: [],
  listsTab: 'personal',
  selectedList: 0,
  lists: [
    { name: 'Compra semanal', type: 'personal', updated: 'Hoy, 09:42', items: [{ name: 'Tomates cherry', qty: '2 bandejas', done: true }, { name: 'Aguacates', qty: '3 unidades', done: false }, { name: 'Pan integral', qty: '1 unidad', done: false }, { name: 'Yogur natural', qty: '4 unidades', done: false }] },
    { name: 'Cena del viernes', type: 'personal', updated: 'Ayer, 18:20', items: [{ name: 'Pasta fresca', qty: '500 g', done: false }, { name: 'Albahaca', qty: '1 manojo', done: false }] },
    { name: 'Casa de la playa', type: 'shared', updated: 'Lun, 12:15', members: 3, items: [{ name: 'Agua mineral', qty: '2 packs', done: true }, { name: 'Fruta variada', qty: '1 bandeja', done: false }] },
  ],
  recipes: [
    { title: 'Bowl mediterráneo', description: 'Fresco, sencillo y listo en 15 minutos.', emoji: '🥗', tone: 'green', author: 'María G.', rating: '9,2', time: '15 min', favorite: true },
    { title: 'Pasta de verano', description: 'Una receta ligera para compartir.', emoji: '🍝', tone: 'rose', author: 'Jorge P.', rating: '8,7', time: '25 min', favorite: false },
    { title: 'Tostada de aguacate', description: 'El desayuno que siempre funciona.', emoji: '🥑', tone: '', author: 'Ana R.', rating: '9,5', time: '10 min', favorite: false },
  ]
};

const viewNames = { home: 'Inicio', lists: 'Mis listas de compra', 'my-recipes': 'Mis recetas', recipes: 'Recetas', profile: 'Perfil y configuración' };
const root = document.getElementById('view-root');
const toast = document.getElementById('toast');
let ready = false;
function userName() { return state.user?.displayName || 'PList'; }
function userInitials() { return userName().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'PL'; }
function persist() {
  if (!ready) return;
  PListDB.save({ lists: state.lists, recipes: state.recipes, listsTab: state.listsTab }).catch(() => showToast('No se pudo guardar en este dispositivo'));
}

function render() {
  document.querySelector('.app-shell')?.classList.remove('auth-mode');
  root.innerHTML = views[state.view]();
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === state.view));
  document.getElementById('breadcrumb-root').textContent = viewNames[state.view];
  document.getElementById('breadcrumb-current').textContent = state.view === 'home' ? `Buenos días, ${userName().split(/\s+/)[0]}` : viewNames[state.view];
  document.getElementById('mode-label').textContent = state.mode === 'admin' ? 'Perfil administrador' : 'Perfil normal';
  const topName = document.querySelector('.profile-chip strong');
  const topAvatar = document.querySelector('.profile-chip .avatar');
  const profileChip = document.querySelector('.profile-chip');
  const notificationButton = document.querySelector('.notification-button');
  const notificationBadge = document.querySelector('.notification-badge');
  if (topName) topName.textContent = userName();
  if (topAvatar) topAvatar.textContent = userInitials();
  profileChip?.removeAttribute('hidden');
  notificationButton?.removeAttribute('hidden');
  const notificationCount = state.notifications.length;
  if (notificationBadge) {
    notificationBadge.textContent = notificationCount;
    notificationBadge.hidden = notificationCount === 0;
  }
  bindEvents();
}

const views = {
  home: () => `<section class="hero"><div><p class="eyebrow">Martes, 8 de noviembre</p><h1>Todo lo que necesitas<br>para comer mejor.</h1><p class="lead">Organiza tu compra, guarda tus recetas favoritas y comparte ideas frescas con tu comunidad.</p></div><div class="hero-actions"><button class="button button-primary" data-action="new-list">+ Nueva lista</button><button class="button button-light" data-view="recipes">Explorar recetas</button></div></section>
    <div class="stats-grid"><div class="stat-card"><span class="stat-label">Listas activas</span><span class="stat-value">${state.lists.length}</span><span class="stat-foot">Tus listas actuales</span></div><div class="stat-card"><span class="stat-label">Productos pendientes</span><span class="stat-value">${pendingItems()}</span><span class="stat-foot">Tu compra está al día</span></div><div class="stat-card"><span class="stat-label">Recetas guardadas</span><span class="stat-value">${state.recipes.filter(r => r.favorite).length}</span><span class="stat-foot">Tus recetas favoritas</span></div><div class="stat-card"><span class="stat-label">Notificaciones</span><span class="stat-value">${state.notifications.length}</span><span class="stat-foot">Avisos pendientes</span></div></div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-header"><h2>Actividad reciente</h2><button class="button button-quiet" data-view="lists">Ver listas</button></div><div class="activity-list"><div class="activity-row"><div class="activity-dot">✓</div><div class="activity-copy"><strong>Compra semanal</strong> está al 25% completada<small>Actualizada hace 12 minutos</small></div></div><div class="activity-row"><div class="activity-dot">✦</div><div class="activity-copy"><strong>Bowl mediterráneo</strong> se ha guardado en favoritos<small>Hace 1 hora</small></div></div><div class="activity-row"><div class="activity-dot">♧</div><div class="activity-copy"><strong>Lucía te ha invitado</strong> a la lista Casa de la playa<small>Ayer, 18:30</small></div></div></div></section><section class="panel"><div class="panel-header"><h2>Tu progreso</h2><span class="eyebrow" style="margin:0">Esta semana</span></div><div class="progress-wrap"><div class="progress-meta"><span>Productos comprados</span><strong>8 de 12</strong></div><div class="progress-track"><div class="progress-bar" style="width:66%"></div></div><p class="lead" style="font-size:12px;margin:4px 0 0">Un pequeño paso cada día hace más fácil comer bien.</p><button class="button button-dark" data-view="lists">Continuar compra</button></div></section></div>`,
  lists: () => { const visible = state.lists.filter(l => l.type === state.listsTab); return `<div class="section-title"><div><p class="eyebrow">Organización</p><h2>Mis listas de compra</h2><p>Planifica tu compra sin perder de vista lo importante.</p></div><button class="button button-primary" data-action="new-list">+ Nueva lista</button></div><div class="tabs"><button class="tab ${state.listsTab === 'personal' ? 'active' : ''}" data-tab="personal">Listas personales</button><button class="tab ${state.listsTab === 'shared' ? 'active' : ''}" data-tab="shared">Listas compartidas</button></div><div class="cards-grid">${visible.map((list, i) => `<article class="list-card"><div class="list-card-top"><div><h3>${list.name}</h3><p>${list.type === 'shared' ? `Compartida con ${list.members} personas` : 'Solo tú'}</p></div><button class="kebab" data-action="list-menu" data-index="${state.lists.indexOf(list)}">···</button></div><div class="list-meta"><span><strong>${list.items.length}</strong> productos</span><span><strong>${list.items.filter(i => !i.done).length}</strong> pendientes</span></div><div class="card-actions"><span class="eyebrow" style="margin:0">${list.updated}</span><button class="button button-light" data-action="open-list" data-index="${state.lists.indexOf(list)}">Abrir lista</button></div></article>`).join('') || `<div class="panel empty-state"><div class="empty-state-icon">🧺</div><h3>Aún no tienes listas aquí</h3><p>Crea una lista para empezar a organizar tu compra.</p></div>`}</div>`; },
  'my-recipes': () => `<div class="section-title"><div><p class="eyebrow">Tu cocina</p><h2>Mis recetas</h2><p>Crea tus propias recetas y guarda tus ideas para otro día.</p></div><button class="button button-primary" data-action="new-recipe">+ Nueva receta</button></div><div class="cards-grid">${state.recipes.slice(0,2).map(recipeCard).join('')}<div class="panel empty-state"><div class="empty-state-icon">✎</div><h3>¿Tienes una idea?</h3><p>Guarda una receta para volver a ella cuando quieras.</p><button class="button button-light" data-action="new-recipe">Crear receta</button></div></div>`,
  recipes: () => `<div class="section-title"><div><p class="eyebrow">Comunidad PList</p><h2>Recetas para inspirarte</h2><p>Ideas frescas de personas a las que les gusta cocinar.</p></div><button class="button button-light" data-action="show-toast">Filtrar recetas</button></div><div class="cards-grid">${state.recipes.map(recipeCard).join('')}</div>`,
  profile: () => `<div class="section-title"><div><p class="eyebrow">Cuenta</p><h2>Perfil y configuración</h2><p>Controla tu experiencia y tus preferencias.</p></div></div>${state.mode === 'admin' ? '<div class="admin-banner"><span><strong>Modo administrador activo.</strong> Las acciones globales quedan registradas.</span><button class="button button-light" data-action="normal-mode">Volver al perfil normal</button></div>' : ''}<div class="profile-layout"><section class="panel profile-card"><div class="profile-avatar-large">${userInitials()}</div><h2>${userName()}</h2><p>@${state.user?.nickname || 'usuario'}</p><div class="profile-stats"><div><strong>${state.recipes.length}</strong><span>Recetas</span></div><div><strong>${state.lists.length}</strong><span>Listas</span></div><div><strong>${state.recipes.filter(r => r.favorite).length}</strong><span>Favoritos</span></div></div></section><section class="panel"><div class="panel-header"><h2>Preferencias</h2></div><div class="setting-row"><div class="setting-copy"><strong>Notificaciones</strong><span>Recibe avisos sobre listas, recetas e invitaciones.</span></div><button class="switch on" data-action="toggle-switch" aria-label="Cambiar notificaciones"></button></div><div class="setting-row"><div class="setting-copy"><strong>Apariencia</strong><span>Elige cómo quieres ver PList.</span></div><select style="width:130px" class="field input"><option>Claro</option><option>Oscuro</option></select></div><div class="setting-row"><div class="setting-copy"><strong>Idioma</strong><span>Español es el idioma de tu interfaz.</span></div><select style="width:130px" class="field input"><option>Español</option><option>English</option></select></div><div class="setting-row"><div class="setting-copy"><strong>Cambiar de perfil</strong><span>${state.mode === 'admin' ? 'Gestiona el contenido y la configuración global.' : 'Accede al modo administrador de la cuenta propietaria.'}</span></div><button class="button ${state.mode === 'admin' ? 'button-light' : 'button-dark'}" data-action="${state.mode === 'admin' ? 'normal-mode' : 'admin-mode'}">${state.mode === 'admin' ? 'Perfil normal' : 'Cambiar de perfil'}</button></div><div class="setting-row"><div class="setting-copy"><strong>Seguridad</strong><span>Contraseña, sesiones y recuperación de PIN.</span></div><button class="button button-light" data-action="show-toast">Gestionar</button></div></section></div>`
};

function recipeCard(recipe) { return `<article class="recipe-card"><div class="recipe-image ${recipe.tone}">${recipe.emoji}</div><div class="recipe-body"><h3>${recipe.title}</h3><p>${recipe.description}</p><div class="recipe-footer"><span>${recipe.author} · ${recipe.time}</span><span class="rating">★ ${recipe.rating}</span></div><button class="button ${recipe.favorite ? 'button-light' : 'button-quiet'}" data-action="favorite" data-title="${recipe.title}">${recipe.favorite ? '♥ Guardada en favoritos' : '♡ Guardar en favoritos'}</button></div></article>`; }
function pendingItems() { return state.lists.reduce((total, list) => total + list.items.filter(item => !item.done).length, 0); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
function openModal(title, body, onSubmit) { document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-header"><h2>${title}</h2><button class="modal-close" data-action="close-modal">×</button></div>${body}<div class="modal-actions"><button class="button button-light" data-action="close-modal">Cancelar</button><button class="button button-primary" id="modal-submit">Guardar</button></div></div></div>`; document.getElementById('modal-submit').addEventListener('click', onSubmit); }
function bindEvents() {
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { state.view = el.dataset.view; document.querySelector('.sidebar')?.classList.remove('open'); render(); }));
  document.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', () => { state.listsTab = el.dataset.tab; render(); }));
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => handleAction(el.dataset.action, el)));
  document.querySelectorAll('.shopping-row input').forEach(el => el.addEventListener('change', () => { const item = state.lists[state.selectedList].items[Number(el.dataset.item)]; item.done = el.checked; persist(); renderListDetail(); showToast(item.done ? 'Producto marcado como comprado' : 'Producto pendiente de compra'); }));
  document.querySelector('.menu-toggle')?.addEventListener('click', () => document.querySelector('.sidebar').classList.add('open'));
  document.querySelector('.mobile-close')?.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open'));
}
function handleAction(action, el) {
  if (action === 'show-toast') showToast('Esta opción estará conectada al backend en la siguiente fase.');
  if (action === 'close-modal') document.getElementById('modal-root').innerHTML = '';
  if (action === 'favorite') { const recipe = state.recipes.find(r => r.title === el.dataset.title); recipe.favorite = !recipe.favorite; persist(); render(); showToast(recipe.favorite ? 'Receta guardada en favoritos' : 'Receta eliminada de favoritos'); }
  if (action === 'new-list') openModal('Nueva lista', `<div class="form-grid"><div class="field"><label for="list-name">Nombre de la lista</label><input id="list-name" placeholder="Ej. Compra del fin de semana" autofocus></div><div class="field"><label for="list-type">Tipo de lista</label><select id="list-type"><option value="personal">Personal</option><option value="shared">Compartida</option></select></div></div>`, () => { const name = document.getElementById('list-name').value.trim(); if (!name) return showToast('Escribe un nombre para la lista'); state.lists.push({ name, type: document.getElementById('list-type').value, updated: 'Ahora', items: [] }); persist(); document.getElementById('modal-root').innerHTML = ''; state.view = 'lists'; render(); showToast('Lista creada correctamente'); });
  if (action === 'open-list') { state.selectedList = Number(el.dataset.index); renderListDetail(); }
  if (action === 'list-menu') showToast('Las opciones de lista estarán disponibles con datos reales.');
  if (action === 'new-recipe') openModal('Nueva receta', `<div class="form-grid"><div class="field"><label for="recipe-title">Título</label><input id="recipe-title" placeholder="Ej. Ensalada de temporada"></div><div class="field"><label for="recipe-description">Descripción</label><textarea id="recipe-description" placeholder="Cuenta brevemente cómo es tu receta"></textarea></div></div>`, () => { const title = document.getElementById('recipe-title').value.trim(); if (!title) return showToast('Escribe un título para la receta'); state.recipes.unshift({ title, description: document.getElementById('recipe-description').value.trim() || 'Una receta casera para compartir.', emoji: '🍲', tone: 'green', author: 'Tú', rating: '—', time: '20 min', favorite: false }); persist(); document.getElementById('modal-root').innerHTML = ''; state.view = 'my-recipes'; render(); showToast('Borrador de receta creado'); });
  if (action === 'admin-mode') openModal('Cambiar a perfil administrador', `<p class="lead" style="font-size:13px">En producción se solicitará aquí el PIN de cuatro dígitos y se validará exclusivamente en backend.</p><div class="form-grid"><div class="field"><label for="admin-pin">PIN de administrador</label><input id="admin-pin" inputmode="numeric" maxlength="4" placeholder="••••" type="password"></div></div>`, () => { const pin = document.getElementById('admin-pin').value; if (pin.length !== 4) return showToast('El PIN debe tener exactamente 4 dígitos'); state.mode = 'admin'; document.getElementById('modal-root').innerHTML = ''; render(); showToast('Modo administrador activado en esta demo'); });
  if (action === 'normal-mode') { state.mode = 'normal'; render(); showToast('Has vuelto al perfil normal'); }
  if (action === 'toggle-switch') { el.classList.toggle('on'); showToast('Preferencia actualizada'); }
}
function renderListDetail() { const list = state.lists[state.selectedList]; root.innerHTML = `<div class="section-title"><div><p class="eyebrow">${list.type === 'shared' ? 'Lista compartida' : 'Lista personal'}</p><h2>${list.name}</h2><p>${list.items.length} productos · ${list.items.filter(i => !i.done).length} pendientes</p></div><div class="hero-actions"><button class="button button-light" data-view="lists">Volver a listas</button><button class="button button-primary" data-action="add-item">+ Añadir producto</button></div></div><div class="list-detail"><section class="panel"><div class="panel-header"><h3>Productos</h3><span class="eyebrow" style="margin:0">${list.items.filter(i => i.done).length}/${list.items.length} comprados</span></div><div class="shopping-list">${list.items.map((item, i) => `<div class="shopping-row ${item.done ? 'done' : ''}"><input type="checkbox" ${item.done ? 'checked' : ''} data-item="${i}"><span class="item-name">${item.name}</span><span class="quantity">${item.qty}</span><button class="delete-item" data-action="delete-item" data-item="${i}" aria-label="Eliminar ${item.name}">×</button></div>`).join('') || '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Añade el primer producto a esta lista.</p></div>'}</div></section><section class="panel"><div class="panel-header"><h3>Resumen</h3></div><div class="progress-wrap"><div class="progress-meta"><span>Progreso de compra</span><strong>${list.items.length ? Math.round(list.items.filter(i => i.done).length / list.items.length * 100) : 0}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${list.items.length ? list.items.filter(i => i.done).length / list.items.length * 100 : 0}%"></div></div><p class="lead" style="font-size:12px">Los productos comprados permanecen en la lista para que puedas consultarlos después.</p></div></section></div>`; bindEvents(); }
document.addEventListener('click', e => { if (e.target.dataset.action === 'add-item') openModal('Añadir producto', `<div class="form-grid"><div class="field"><label for="item-name">Producto</label><input id="item-name" placeholder="Ej. Limones"></div><div class="field"><label for="item-qty">Cantidad</label><input id="item-qty" placeholder="Ej. 4 unidades"></div></div>`, () => { const name = document.getElementById('item-name').value.trim(); if (!name) return showToast('Escribe un producto'); state.lists[state.selectedList].items.push({ name, qty: document.getElementById('item-qty').value.trim() || '1 unidad', done: false }); persist(); document.getElementById('modal-root').innerHTML = ''; renderListDetail(); showToast('Producto añadido'); }); if (e.target.dataset.action === 'delete-item') { state.lists[state.selectedList].items.splice(Number(e.target.dataset.item), 1); persist(); renderListDetail(); showToast('Producto eliminado'); } });
async function start() {
  if (!window.PListBackend?.enabled) {
    root.innerHTML = '<section class="panel empty-state"><div class="empty-state-icon">⚠</div><h2>No se ha podido conectar con PList</h2><p>La aplicación no va a mostrar datos de demostración porque el backend no está disponible. Recarga la página o inténtalo de nuevo más tarde.</p><button class="button button-primary" onclick="location.reload()">Reintentar conexión</button></section>';
    return;
  }
  try {
    const saved = await PListDB.load();
    if (saved?.lists) state.lists = saved.lists;
    if (saved?.recipes) state.recipes = saved.recipes;
    if (saved?.listsTab) state.listsTab = saved.listsTab;
    if (window.PListBackend?.enabled) {
      const sessionResult = await PListBackend.session();
      const session = sessionResult.data?.session;
      if (session) {
        const profileResult = await PListBackend.client.from('profiles').select('display_name,nickname').eq('id', session.user.id).maybeSingle();
        const profile = profileResult.data;
        state.user = { displayName: profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'PList', nickname: profile?.nickname || session.user.user_metadata?.nickname || 'usuario' };
        state.notifications = [];
        state.lists = [];
        state.recipes = [];
      } else {
        return;
      }
    }
    ready = true;
  } catch (error) { console.warn('PList se ejecuta sin persistencia local', error); }
  render();
}
start();
