# Backend de PList con Supabase

PList usa Supabase como backend inicial sin depender de Google para el registro. El usuario se registra con email y contraseña, confirma su correo y después accede a sus datos mediante políticas RLS de PostgreSQL.

## Servicios

- Supabase Auth: email y contraseña, verificación y recuperación de contraseña.
- PostgreSQL: perfiles, listas, recetas, favoritos, comentarios, valoraciones, invitaciones y auditoría.
- Supabase Storage: avatares y fotos principales de recetas.
- Edge Functions: PIN de administrador, recuperación por código y operaciones sensibles.

## Configuración

1. Crea un proyecto gratuito en Supabase.
2. Ejecuta `schema.sql` en el SQL Editor.
3. Activa la confirmación de email en Authentication.
4. Copia `supabase-config.example.js` como `supabase-config.js` y añade la URL y la clave pública.
5. Configura SMTP en Authentication > SMTP Settings. Para pruebas puede usarse el correo integrado de Supabase, pero solo envía a miembros del equipo y tiene un límite aproximado de 2 mensajes por hora. Para acceso público, usa la opción Brevo descrita más abajo.
6. Despliega las Edge Functions desde la carpeta `supabase/functions` cuando el CLI de Supabase esté disponible.

## Después de ejecutar el esquema principal

Ejecuta también `migrations/002_profile_trigger.sql`. Crea automáticamente el perfil visible al registrarse, sin exponer el email en la aplicación.

## Correo gratuito para usuarios reales

Opción recomendada: Brevo Free. Crea una cuenta, verifica el remitente o dominio y copia el host SMTP, puerto, usuario y contraseña SMTP en Supabase > Authentication > SMTP Settings. El plan gratuito indica 300 mensajes diarios y no requiere tarjeta, pero sigue sujeto a sus políticas y límites.

Alternativas: otro proveedor SMTP gratuito compatible o el servidor integrado de Supabase solo para pruebas internas. El servidor integrado no sirve para una aplicación pública porque rechaza direcciones que no pertenezcan al equipo y tiene límites bajos.

## Publicación gratuita de la web

- GitHub Pages: adecuado para este frontend estático; no guarda secretos y no ejecuta backend.
- Netlify Free: opción sencilla para publicar la carpeta del proyecto.
- Vercel Hobby: opción sencilla si después migramos a un framework.

Para GitHub Pages, el repositorio ya incluye un workflow en `.github/workflows/deploy-pages.yml`. En GitHub abre `Settings > Pages`, selecciona `GitHub Actions` como fuente y ejecuta el workflow si no se inicia automáticamente.

El frontend solo necesita la URL de Supabase y la clave pública. La clave secreta nunca debe aparecer en la web.

La clave pública puede estar en el frontend. Nunca se debe incluir la `service_role` key en el navegador ni en el repositorio.
