(() => {
  const root = document.getElementById('view-root');
  let mode = 'signin';
  const copy = {
    signin: { title: 'Bienvenido de nuevo', subtitle: 'Accede a tus listas y recetas.', button: 'Entrar' },
    signup: { title: 'Crea tu cuenta PList', subtitle: 'Organiza tu compra y descubre recetas frescas.', button: 'Crear cuenta' },
  };

  function renderAuth(message = '') {
    const text = copy[mode];
    root.innerHTML = `<section class="auth-shell"><div class="auth-card"><div class="auth-brand"><img src="assets/PList_logo_transparente.png" alt="PList"><span>Listas y Recetas frescas</span></div><p class="eyebrow">Cuenta PList</p><h1>${text.title}</h1><p class="lead">${text.subtitle}</p>${message ? `<div class="auth-message">${message}</div>` : ''}<form id="auth-form" class="form-grid">${mode === 'signup' ? '<div class="field"><label for="auth-name">Nombre visible</label><input id="auth-name" required maxlength="80" autocomplete="name" placeholder="Tu nombre"></div><div class="field"><label for="auth-nickname">Apodo público</label><input id="auth-nickname" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="ej. alexcocina"></div>' : ''}<div class="field"><label for="auth-email">Email</label><input id="auth-email" type="email" required autocomplete="email" placeholder="tu@email.com"></div><div class="field"><label for="auth-password">Contraseña</label><input id="auth-password" type="password" required minlength="8" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" placeholder="Mínimo 8 caracteres"></div><button class="button button-primary" type="submit">${text.button}</button></form><button class="auth-switch" id="auth-switch">${mode === 'signin' ? '¿Aún no tienes cuenta? Crear cuenta' : 'Ya tengo una cuenta · Entrar'}</button>${mode === 'signin' ? '<button class="auth-link" id="auth-reset">He olvidado mi contraseña</button>' : ''}</div></section>`;
    document.getElementById('auth-form').addEventListener('submit', submitAuth);
    document.getElementById('auth-switch').addEventListener('click', () => { mode = mode === 'signin' ? 'signup' : 'signin'; renderAuth(); });
    document.getElementById('auth-reset')?.addEventListener('click', resetPassword);
  }

  async function submitAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    if (mode === 'signup') {
      const profile = { display_name: document.getElementById('auth-name').value.trim(), nickname: document.getElementById('auth-nickname').value.trim() };
      const result = await PListBackend.signUp(email, password, profile);
      if (result.error) return renderAuth(result.error.message);
      renderAuth('Cuenta creada. Revisa tu correo para confirmar la dirección antes de entrar.');
      const message = document.querySelector('.auth-message');
      message.insertAdjacentHTML('beforeend', '<br><button class="auth-inline-link" id="auth-resend">Reenviar correo de confirmación</button>');
      document.getElementById('auth-resend').addEventListener('click', async () => {
        const resend = await PListBackend.resendSignup(email);
        message.textContent = resend.error ? 'No se pudo reenviar el correo. Revisa la configuración SMTP.' : 'Solicitud enviada. Revisa también la carpeta de spam.';
      });
      return;
    }
    const result = await PListBackend.signIn(email, password);
    if (result.error) return renderAuth('No se pudo iniciar sesión. Comprueba el email y la contraseña.');
    location.reload();
  }

  async function resetPassword() {
    const email = document.getElementById('auth-email')?.value.trim();
    if (!email) return renderAuth('Escribe primero tu email para enviarte el enlace de recuperación.');
    const result = await PListBackend.client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
    renderAuth(result.error ? result.error.message : 'Te hemos enviado un enlace de recuperación si el email existe.');
  }

  async function showWhenReady() {
    if (!window.PListBackend?.enabled) return;
    const { data } = await PListBackend.session();
    if (!data.session) renderAuth();
  }
  window.addEventListener('plist-backend-ready', showWhenReady);
})();
