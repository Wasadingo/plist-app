from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
DOCX = OUT / 'Manual_PList_Proyecto.docx'
LOGO = ROOT / 'assets' / 'PList_logo_transparente.png'
REFERENCE = ROOT / 'assets' / 'PList_referencia_visual_interfaz.png'

NAVY = '12304A'
GREEN = '398F69'
LIGHT = 'EEF4F1'
GRAY = 'D9E1DE'
TEXT = '243746'

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def borders(cell, color=GRAY, size='6'):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    b = tcPr.first_child_found_in('w:tcBorders')
    if b is None:
        b = OxmlElement('w:tcBorders')
        tcPr.append(b)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        tag = 'w:' + edge
        el = b.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            b.append(el)
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), size)
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), color)

def set_cell_text(cell, text, bold=False, color=TEXT, size=9.5):
    cell.text = ''
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(str(text))
    run.bold = bold
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run.font.name = 'Aptos'
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    borders(cell)

def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    for i, h in enumerate(headers):
        set_cell_text(table.rows[0].cells[i], h, True, 'FFFFFF', 9)
        shade(table.rows[0].cells[i], NAVY)
    for r, row in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(row):
            set_cell_text(cells[i], value, False, TEXT, 8.8)
            if r % 2 == 1:
                shade(cells[i], 'F7FAF8')
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table

def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_after = Pt(3)
    p.add_run(text)
    return p

def add_number(doc, text):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_after = Pt(3)
    p.add_run(text)
    return p

def add_code(doc, text):
    p = doc.add_paragraph(style='Code Block')
    p.paragraph_format.left_indent = Inches(0.18)
    p.paragraph_format.right_indent = Inches(0.18)
    p.paragraph_format.space_after = Pt(7)
    p.add_run(text)
    return p

def add_note(doc, lead, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(7)
    r = p.add_run(lead + ' ')
    r.bold = True
    r.font.color.rgb = RGBColor.from_string(GREEN)
    p.add_run(text)
    return p

def page_break(doc):
    doc.add_page_break()

def configure(doc):
    section = doc.sections[0]
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)
    styles = doc.styles
    normal = styles['Normal']
    normal.font.name = 'Aptos'
    normal.font.size = Pt(10)
    normal.font.color.rgb = RGBColor.from_string(TEXT)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.08
    for name, size, color in [('Title', 26, '000000'), ('Heading 1', 17, '000000'), ('Heading 2', 13, '000000'), ('Heading 3', 11, '000000')]:
        style = styles[name]
        style.font.name = 'Aptos Display' if name == 'Title' else 'Aptos'
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(12 if name != 'Title' else 0)
        style.paragraph_format.space_after = Pt(6)
        if name == 'Title':
            ppr = style._element.get_or_add_pPr()
            border = ppr.find(qn('w:pBdr'))
            if border is not None:
                ppr.remove(border)
    if 'Code Block' not in styles:
        code = styles.add_style('Code Block', WD_STYLE_TYPE.PARAGRAPH)
    else:
        code = styles['Code Block']
    code.font.name = 'Consolas'
    code.font.size = Pt(8.5)
    code.font.color.rgb = RGBColor.from_string('1F3A4D')
    code.paragraph_format.space_after = Pt(5)
    code.paragraph_format.left_indent = Inches(0.12)
    # Header/footer
    header = section.header.paragraphs[0]
    header.text = 'PList  |  Manual del proyecto'
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in header.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = RGBColor.from_string('6B7C86')
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run('PList · Documento de mantenimiento y presentación · 12 de noviembre de 2026')
    for run in footer.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = RGBColor.from_string('6B7C86')

def build():
    doc = Document()
    configure(doc)

    # Cover
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(24)
    p.add_run().add_picture(str(LOGO), width=Inches(5.8))
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    title = doc.add_paragraph(style='Title')
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run('Manual completo del proyecto PList')
    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_after = Pt(18)
    r = sub.add_run('Listas y Recetas frescas')
    r.font.size = Pt(16); r.font.color.rgb = RGBColor.from_string(GREEN); r.bold = True
    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    intro.add_run('Guía para entender, mantener, probar y seguir desarrollando la aplicación.').italic = True
    doc.add_paragraph()
    add_table(doc, ['Dato', 'Información'], [
        ('Propietario del proyecto', 'Periche / Wasadingo'),
        ('Repositorio', 'https://github.com/Wasadingo/plist-app'),
        ('Aplicación publicada', 'https://wasadingo.github.io/plist-app/'),
        ('Backend', 'Supabase · proyecto qfavfkxgszapbiquafrw'),
        ('Correo principal de administración', 'periche1995@gmail.com'),
        ('Estado del documento', 'Manual vivo: actualizarlo después de cada cambio importante'),
    ], [1.7, 4.7])
    add_note(doc, 'Importante.', 'Este manual no incluye contraseñas, claves service_role, claves privadas VAPID ni API keys secretas. Esas credenciales se guardan solo en Supabase y nunca deben publicarse en GitHub.')
    page_break(doc)

    doc.add_heading('Cómo usar este manual', level=1)
    doc.add_paragraph('Este documento está pensado para una persona que no trabaja todos los días con programación. Primero explica qué es PList con palabras sencillas. Después describe cada parte técnica, dónde está cada archivo y qué pasos hay que seguir para cambiar imágenes, correos, usuarios, listas, permisos o notificaciones.')
    doc.add_paragraph('Cuando aparezca la palabra usuario se refiere a la persona que utiliza PList. Cuando aparezca administrador se refiere a la cuenta con permisos globales. Cuando aparezca Supabase se refiere al servicio que guarda los datos, autentica las cuentas y ejecuta funciones del servidor.')
    doc.add_heading('Índice práctico', level=2)
    for item in [
        '1. Qué es PList y qué problema resuelve',
        '2. Arquitectura explicada de forma sencilla',
        '3. Servicios y cuentas utilizadas',
        '4. Estructura de carpetas y archivos',
        '5. Funciones principales de la aplicación',
        '6. Usuarios, perfiles y administrador',
        '7. Listas compartidas y permisos',
        '8. Notificaciones y Web Push',
        '9. Correos, Brevo y feedback',
        '10. PWA y compatibilidad con dispositivos',
        '11. Cómo hacer cambios habituales',
        '12. Pruebas y solución de problemas',
        '13. Historial de cambios',
        '14. Lista de comprobación antes de publicar',
    ]:
        add_bullet(doc, item)

    doc.add_heading('1 Qué es PList y qué problema resuelve', level=1)
    doc.add_paragraph('PList es una aplicación web para organizar la compra y guardar recetas. Permite que una persona cree listas privadas, comparta una lista con otro usuario y trabaje con ella de forma colaborativa. También permite guardar recetas, recibir invitaciones, consultar actividad y recibir avisos cuando otro miembro modifica una lista.')
    doc.add_paragraph('La aplicación se diseñó para funcionar desde ordenador, portátil, tablet y móvil. También puede instalarse como PWA, es decir, como una aplicación que se abre desde un icono y puede enviar notificaciones del dispositivo.')
    add_table(doc, ['Necesidad', 'Respuesta de PList'], [
        ('Organizar compras', 'Listas personales con productos, cantidades y estado comprado.'),
        ('Trabajar con otra persona', 'Listas compartidas, invitaciones y rol de colaborador.'),
        ('No perder cambios', 'Supabase guarda los datos en la nube y el navegador mantiene la sesión.'),
        ('Saber qué ha pasado', 'Actividad reciente y notificaciones internas.'),
        ('Recibir avisos', 'Notificaciones del navegador y Web Push por dispositivo.'),
        ('Gestionar la aplicación', 'Perfil administrador protegido con PIN de cuatro dígitos.'),
    ], [2.2, 4.2])

    doc.add_heading('2 Arquitectura explicada de forma sencilla', level=1)
    doc.add_paragraph('PList tiene tres capas. La primera es la pantalla que ve la persona. La segunda es Supabase, que guarda los datos y controla los permisos. La tercera son las funciones que realizan tareas privadas, como enviar correos o avisos push.')
    doc.add_heading('Qué ocurre cuando una persona utiliza PList', level=2)
    add_number(doc, 'La persona abre la dirección de GitHub Pages.')
    add_number(doc, 'El navegador carga HTML, estilos, imágenes y JavaScript.')
    add_number(doc, 'El JavaScript comprueba si hay una sesión de Supabase.')
    add_number(doc, 'Si no hay sesión, aparece la pantalla de entrada o creación de cuenta.')
    add_number(doc, 'Si hay sesión, se carga el perfil real y solo se consultan los datos de ese usuario.')
    add_number(doc, 'Cuando se cambia una lista, Supabase guarda el cambio y crea las notificaciones necesarias.')
    add_number(doc, 'Si el dispositivo tiene Web Push activado, una Edge Function envía el aviso aunque la aplicación esté cerrada.')
    add_table(doc, ['Parte', 'Función', 'Ejemplo'], [
        ('Frontend', 'Pantallas e interacción', 'app.js, auth.js, styles.css'),
        ('Base de datos', 'Usuarios, listas, productos y permisos', 'Supabase PostgreSQL'),
        ('Autenticación', 'Registro, entrada y recuperación de contraseña', 'Supabase Auth'),
        ('Funciones servidor', 'Correo, administración y push', 'Edge Functions'),
        ('Publicación', 'Hace visible la aplicación', 'GitHub Pages y GitHub Actions'),
        ('Instalación', 'Convierte la web en PWA', 'manifest.webmanifest y sw.js'),
    ], [1.3, 2.7, 2.4])
    doc.add_heading('Vista general', level=2)
    add_code(doc, 'Usuario\n  └── PList publicada en GitHub Pages\n        ├── Supabase Auth: identifica la cuenta\n        ├── Supabase Database: guarda listas y recetas\n        ├── Supabase Realtime: avisa de cambios en directo\n        ├── Edge Functions: correo, PIN y Web Push\n        └── Service Worker: PWA y avisos del dispositivo')

    doc.add_heading('3 Servicios y cuentas utilizadas', level=1)
    add_table(doc, ['Servicio', 'Para qué se utiliza', 'Qué no debe hacerse'], [
        ('GitHub', 'Repositorio del código y publicación automática.', 'No guardar claves privadas ni contraseñas.'),
        ('GitHub Pages', 'Dirección pública de la aplicación.', 'No editar manualmente archivos publicados.'),
        ('Supabase', 'Base de datos, usuarios, permisos, funciones y Realtime.', 'No exponer service_role en el navegador.'),
        ('Brevo', 'Correo de confirmación, recuperación y feedback.', 'No usar la cuenta SMTP como remitente.'),
        ('Navegador / PWA', 'Permisos y recepción Web Push.', 'No cerrar sesión si se quieren recibir avisos.'),
    ], [1.3, 3.2, 1.9])
    add_note(doc, 'Direcciones principales.', 'Supabase: https://qfavfkxgszapbiquafrw.supabase.co · GitHub: https://github.com/Wasadingo/plist-app · Aplicación: https://wasadingo.github.io/plist-app/')
    doc.add_paragraph('Las claves públicas pueden aparecer en el frontend porque están protegidas por RLS. Las claves secretas se guardan en Supabase Secrets. Esta separación es importante para que una persona que visite la web no pueda administrar la base de datos.')

    doc.add_heading('4 Estructura de carpetas y archivos', level=1)
    add_table(doc, ['Ruta', 'Qué contiene', 'Cuándo tocarla'], [
        ('index.html', 'Estructura general, navegación, cabecera, menús y carga de scripts.', 'Al cambiar el esqueleto principal o añadir un recurso.'),
        ('styles.css', 'Colores, tamaños, tarjetas, formularios, responsive y PWA visual.', 'Al cambiar apariencia o compatibilidad de pantallas.'),
        ('app.js', 'Estado de usuario, inicio, listas, recetas, actividad, menús y acciones.', 'Al cambiar comportamiento de las pantallas autenticadas.'),
        ('auth.js', 'Crear cuenta, entrar, recuperar contraseña y confirmar correo.', 'Al cambiar el acceso o los textos de autenticación.'),
        ('supabase-client.js', 'Conexión del navegador con Supabase y funciones disponibles.', 'Al añadir una operación de base de datos.'),
        ('db.js', 'Persistencia local del navegador para preferencias y actividad local.', 'Al cambiar IndexedDB o datos locales.'),
        ('supabase-config.public.js', 'URL, clave pública y clave pública VAPID.', 'Al cambiar de proyecto Supabase o de pareja VAPID pública.'),
        ('sw.js', 'Caché PWA, recepción push y apertura al pulsar una notificación.', 'Al cambiar PWA, caché o enlaces de notificaciones.'),
        ('manifest.webmanifest', 'Nombre, iconos, color, modo instalado y URL inicial.', 'Al cambiar instalación o identidad visual.'),
        ('assets/', 'Logotipos e imágenes visuales.', 'Al cambiar logotipos o recursos.'),
        ('supabase/schema.sql', 'Esquema inicial de tablas y políticas.', 'Solo para revisar o reconstruir una base nueva.'),
        ('supabase/migrations/', 'Cambios incrementales del backend.', 'Cada cambio de base de datos debe tener una migración.'),
        ('supabase/functions/', 'Código servidor que no debe ejecutarse en el navegador.', 'Correo, push y otras tareas privadas.'),
        ('.github/workflows/', 'Automatización de publicación en GitHub Pages.', 'Solo al cambiar el proceso de despliegue.'),
    ], [1.75, 2.9, 1.75])
    doc.add_heading('Regla sencilla para elegir archivo', level=2)
    doc.add_paragraph('Si el cambio es visual, normalmente se toca styles.css, index.html o assets. Si cambia una pantalla o un botón, se toca app.js o auth.js. Si cambia dónde se guardan los datos o quién puede verlos, se crea una migración SQL. Si utiliza una clave privada o llama a Brevo/Web Push, debe ir en una Edge Function.')
    if REFERENCE.exists():
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(REFERENCE), width=Inches(6.0))
        cap = doc.add_paragraph('Referencia visual de la interfaz inicial de PList')
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.runs[0].italic = True

    doc.add_heading('5 Funciones principales de la aplicación', level=1)
    doc.add_heading('Acceso y cuenta', level=2)
    add_bullet(doc, 'Crear cuenta con nombre visible, apodo, correo y contraseña.')
    add_bullet(doc, 'Confirmar el correo mediante Supabase Auth y Brevo.')
    add_bullet(doc, 'Entrar y salir de la cuenta.')
    add_bullet(doc, 'Solicitar un enlace para recuperar la contraseña.')
    add_bullet(doc, 'Mostrar siempre el perfil real de la cuenta autenticada.')
    doc.add_heading('Listas de compra', level=2)
    add_bullet(doc, 'Crear lista personal o compartida.')
    add_bullet(doc, 'Añadir productos y cantidades.')
    add_bullet(doc, 'Marcar un producto como comprado o pendiente.')
    add_bullet(doc, 'Editar o eliminar una lista mediante el menú de tres puntos.')
    add_bullet(doc, 'Abrir una lista para consultar su progreso.')
    doc.add_heading('Recetas', level=2)
    add_bullet(doc, 'Consultar recetas disponibles.')
    add_bullet(doc, 'Guardar recetas en favoritos.')
    add_bullet(doc, 'Crear, editar y eliminar recetas desde el menú de acciones.')
    doc.add_heading('Ayuda y feedback', level=2)
    doc.add_paragraph('El formulario de Ayuda y feedback permite enviar el correo de contacto, el tipo de mensaje y una explicación. La información se guarda en la tabla feedback y se envía a periche1995@gmail.com mediante la función send-feedback y Brevo.')

    doc.add_heading('6 Usuarios perfiles y administrador', level=1)
    doc.add_paragraph('Cada cuenta tiene un perfil normal. La cuenta autorizada para administrar PList puede configurar un PIN privado de cuatro dígitos y cambiar entre perfil normal y perfil administrador.')
    add_table(doc, ['Perfil', 'Puede hacer', 'No debe hacer'], [
        ('Usuario normal', 'Gestionar sus listas, sus productos, sus recetas y las listas compartidas permitidas.', 'Ver o modificar datos de otras cuentas sin invitación.'),
        ('Colaborador', 'Añadir productos, marcarlos como comprados y modificar o eliminar los que ha creado, según las reglas de la lista.', 'Eliminar productos creados por otra persona si no tiene permiso.'),
        ('Propietario', 'Compartir la lista, administrar miembros y gestionar el contenido de su lista.', 'Compartir el PIN o las claves del sistema.'),
        ('Administrador', 'Acceder a funciones globales autorizadas mediante PIN.', 'Usar el PIN como sustituto de la contraseña o compartirlo.'),
    ], [1.3, 3.3, 1.8])
    add_note(doc, 'Seguridad.', 'El PIN no debe aparecer en el código ni en GitHub. Se guarda como hash y se comprueba mediante funciones de Supabase.')

    doc.add_heading('7 Listas compartidas y permisos', level=1)
    doc.add_paragraph('El propietario busca al destinatario mediante su apodo público. Supabase crea una invitación en list_invitations y una notificación en notifications. El destinatario puede aceptar o rechazar desde su panel.')
    add_code(doc, 'Propietario\n  └── crea lista compartida\n        └── invita mediante apodo\n              └── destinatario recibe notificación\n                    ├── aceptar → list_members con rol collaborator\n                    └── rechazar → invitación cerrada sin acceso')
    add_table(doc, ['Tabla o función', 'Responsabilidad'], [
        ('shopping_lists', 'Nombre, propietario y tipo de lista.'),
        ('shopping_items', 'Productos, cantidades, estado comprado y autor.'),
        ('list_members', 'Miembros y rol owner o collaborator.'),
        ('list_invitations', 'Invitaciones pendientes, aceptadas o rechazadas.'),
        ('notifications', 'Avisos internos de invitaciones y cambios.'),
        ('create_list_invitation', 'Comprueba propietario y crea una invitación.'),
        ('respond_list_invitation', 'Acepta o rechaza, añade miembro y cierra el aviso.'),
    ], [2.0, 4.4])

    doc.add_heading('8 Notificaciones y Web Push', level=1)
    doc.add_paragraph('Hay dos mecanismos relacionados pero diferentes. Supabase Realtime actualiza la aplicación cuando está abierta. Web Push envía un aviso al dispositivo cuando la PWA está cerrada, siempre que la persona haya concedido permiso y no haya cerrado sesión.')
    add_table(doc, ['Situación', 'Resultado'], [
        ('Aplicación abierta', 'Se actualiza el icono y aparece la notificación interna.'),
        ('Aplicación en segundo plano', 'Puede aparecer el aviso del navegador si la suscripción está activa.'),
        ('PWA cerrada', 'La Edge Function envía Web Push al dispositivo registrado.'),
        ('Sesión cerrada', 'Se elimina la suscripción del dispositivo para esa cuenta.'),
        ('iPhone', 'Hay que instalar PList como PWA desde Safari y usar iOS/iPadOS compatible.'),
    ], [2.0, 4.4])
    doc.add_heading('Piezas necesarias', level=2)
    add_bullet(doc, 'push_subscriptions: guarda una suscripción por cuenta y dispositivo.')
    add_bullet(doc, 'Service worker: recibe el push y abre la ruta correcta de GitHub Pages.')
    add_bullet(doc, 'send-push: busca las suscripciones del destinatario y envía el aviso.')
    add_bullet(doc, 'Trigger o webhook: llama a send-push cuando entra una fila nueva en notifications.')
    add_bullet(doc, 'Claves VAPID: permiten demostrar que el envío pertenece a PList.')
    add_note(doc, 'Problema típico.', 'Si llega el aviso pero al pulsarlo aparece 404, revisar la ruta del service worker y comprobar que contiene /plist-app/. La corrección actual usa self.registration.scope.')

    doc.add_heading('9 Correos Brevo y feedback', level=1)
    doc.add_paragraph('Brevo se utiliza para enviar mensajes de correo. El remitente debe ser un correo verificado en Brevo. El usuario SMTP de Brevo no debe utilizarse como dirección From.')
    add_table(doc, ['Dato', 'Uso', 'Valor o ubicación'], [
        ('FEEDBACK_RECIPIENT_EMAIL', 'Destino de sugerencias', 'periche1995@gmail.com'),
        ('FEEDBACK_SENDER_EMAIL', 'Remitente verificado', 'Correo verificado dentro de Brevo'),
        ('BREVO_API_KEY', 'Permite enviar correo transaccional', 'Secreto en Supabase'),
        ('IP autorizada', 'Seguridad opcional de Brevo', 'Puede variar en funciones serverless'),
    ], [2.1, 2.4, 1.9])
    add_note(doc, 'Error 401 de Brevo.', 'Si aparece un mensaje de IP no reconocida, revisar Security / Authorised IPs en Brevo. Para una Edge Function suele ser más estable una clave exclusiva con permiso de correo transaccional y sin restricción de IP fija.')

    doc.add_heading('10 PWA y compatibilidad', level=1)
    add_table(doc, ['Dispositivo', 'Qué hacer'], [
        ('Ordenador', 'Abrir Chrome o Edge, permitir avisos y, si se desea, instalar PList.'),
        ('Android', 'Abrir con Chrome, instalar la PWA y activar avisos desde Perfil y configuración.'),
        ('iPhone o iPad', 'Abrir con Safari, añadir a pantalla de inicio, abrir desde el icono y aceptar avisos.'),
        ('Tablet', 'Usar el navegador compatible y activar el permiso de notificaciones.'),
    ], [1.7, 4.7])
    doc.add_paragraph('El archivo manifest.webmanifest define el nombre y la instalación. El service worker mantiene recursos de la aplicación en caché, recibe push y abre la aplicación al pulsar la notificación. Cada cambio importante del service worker debe aumentar el nombre de caché, por ejemplo plist-shell-v7 a plist-shell-v8.')

    doc.add_heading('11 Cómo hacer cambios habituales', level=1)
    doc.add_heading('Cambiar el logotipo', level=2)
    add_number(doc, 'Sustituir el archivo correspondiente dentro de assets, manteniendo el nombre si no se quiere cambiar el código.')
    add_number(doc, 'Comprobar que el formato es PNG y que tiene fondo transparente cuando se use en la pantalla de acceso.')
    add_number(doc, 'Revisar index.html, auth.js y manifest.webmanifest si se cambia el nombre del archivo.')
    add_number(doc, 'Aumentar la caché del service worker si el navegador conserva la imagen antigua.')
    doc.add_heading('Cambiar textos', level=2)
    add_bullet(doc, 'Textos de entrada y recuperación: auth.js.')
    add_bullet(doc, 'Textos de inicio, listas, recetas y perfil: app.js.')
    add_bullet(doc, 'Textos generales de navegación: index.html.')
    doc.add_heading('Cambiar colores o tamaños', level=2)
    add_bullet(doc, 'Variables y colores principales: styles.css.')
    add_bullet(doc, 'Diseño móvil: bloque @media de styles.css.')
    add_bullet(doc, 'Colores de marca de documentos y manuales: no afectan a la aplicación.')
    doc.add_heading('Cambiar el correo receptor de feedback', level=2)
    add_number(doc, 'Entrar en Supabase → Edge Functions → send-feedback → Secrets.')
    add_number(doc, 'Cambiar FEEDBACK_RECIPIENT_EMAIL.')
    add_number(doc, 'No modificar el código público ni subir la API key a GitHub.')
    add_number(doc, 'Probar el formulario desde Ayuda y feedback.')
    doc.add_heading('Añadir una tabla o campo nuevo', level=2)
    add_number(doc, 'Crear una nueva migración dentro de supabase/migrations/.')
    add_number(doc, 'Activar RLS si la tabla contiene datos de usuarios.')
    add_number(doc, 'Crear políticas para select, insert, update y delete según el rol.')
    add_number(doc, 'Añadir la operación correspondiente en supabase-client.js.')
    add_number(doc, 'Conectar la operación a app.js y probar con dos cuentas.')

    doc.add_heading('12 Pruebas y solución de problemas', level=1)
    add_table(doc, ['Síntoma', 'Causa habitual', 'Comprobación'], [
        ('Aparece Alex o contenido de ejemplo', 'Caché antigua o datos demo.', 'Abrir la versión con ?v=commit, revisar service worker y limpiar caché PWA.'),
        ('No llega correo', 'SMTP/Brevo o remitente no verificado.', 'Revisar Secrets y logs de la Edge Function.'),
        ('Brevo 401', 'IP no autorizada o API key limitada.', 'Revisar Authorised IPs y permiso de correo transaccional.'),
        ('No llega push cerrado', 'No hay fila en push_subscriptions o falla send-push.', 'Revisar tabla, webhook y logs de send-push.'),
        ('Push abre 404', 'Ruta incorrecta en service worker.', 'Usar self.registration.scope y renovar caché.'),
        ('Perfil muestra otra persona', 'Sesión/caché antigua o consulta sin filtro.', 'Cerrar sesión, comprobar user_id y revisar listLists.'),
        ('Invitación sigue pendiente', 'No se ejecutó migración 007.', 'Revisar respond_list_invitation y read_at.'),
    ], [1.8, 2.5, 2.1])
    doc.add_heading('Prueba mínima para una publicación', level=2)
    for item in ['Crear una cuenta nueva y confirmar el correo.', 'Entrar desde un segundo navegador o móvil.', 'Crear una lista personal y añadir un producto.', 'Crear una lista compartida e invitar a otra cuenta.', 'Aceptar la invitación y comprobar el rol colaborador.', 'Añadir y completar productos desde ambas cuentas.', 'Limpiar notificaciones.', 'Cerrar completamente la PWA y probar Web Push.', 'Cerrar sesión y confirmar que el dispositivo deja de recibir avisos.']:
        add_bullet(doc, item)

    doc.add_heading('13 Historial de cambios', level=1)
    add_table(doc, ['Commit', 'Cambio'], [
        ('5c839c0', 'Corrección del enlace de apertura de notificaciones push.'),
        ('5464f1b', 'Web Push para avisos con la PWA cerrada.'),
        ('655a545', 'Limpieza de notificaciones y cierre de invitaciones.'),
        ('df6d32f', 'Avisos en tiempo real para listas compartidas.'),
        ('7854ffd', 'Eliminación de datos de demostración del frontend.'),
        ('42ecfa1', 'Ayuda, feedback y envío mediante Brevo.'),
        ('6b46933', 'Cambio explícito entre perfil normal y administrador.'),
        ('7ab6693', 'Corrección de pgcrypto para el PIN.'),
        ('42f48d0', 'Recuperación de contraseña.'),
        ('a31a515', 'Invitaciones y notificaciones conectadas con Supabase.'),
        ('38bc4a5', 'Restricciones para productos de colaboradores.'),
    ], [1.1, 5.3])

    doc.add_heading('14 Lista de comprobación antes de publicar', level=1)
    for item in [
        'El código no contiene nombres de usuarios de prueba ni datos del prototipo.',
        'No hay claves secretas dentro de archivos públicos ni commits.',
        'La aplicación carga el perfil del usuario autenticado.',
        'Las migraciones SQL están ejecutadas en Supabase.',
        'Las políticas RLS protegen las tablas de usuarios.',
        'La función send-feedback tiene sus secretos configurados.',
        'La función send-push tiene sus secretos VAPID configurados.',
        'El webhook o trigger de notifications funciona.',
        'El workflow de GitHub Pages aparece en verde.',
        'La PWA abre la ruta /plist-app/ y no devuelve 404.',
        'Se ha probado la aplicación con dos cuentas diferentes.',
        'Se ha probado al menos un ordenador y un móvil.',
        'Se ha comprobado la limpieza de notificaciones y el cierre de sesión.',
    ]:
        add_bullet(doc, '☐ ' + item)

    doc.add_heading('Apéndice A Datos que conviene guardar aparte', level=1)
    doc.add_paragraph('Para proteger el proyecto, conviene guardar estos datos en un gestor de contraseñas o documento privado separado del repositorio: contraseña de GitHub, acceso de Supabase, API key de Brevo, service_role de Supabase, PIN de administrador, VAPID private key y PUSH_WEBHOOK_SECRET. Este manual solo explica el nombre y la ubicación de cada dato, no almacena sus valores privados.')
    doc.add_heading('Apéndice B Regla de mantenimiento', level=1)
    doc.add_paragraph('Cada vez que se haga un cambio importante, actualizar este manual con la fecha, el motivo, el archivo o migración afectada y la prueba realizada. Si el cambio modifica la base de datos, crear una migración nueva; no editar una migración antigua que ya se haya ejecutado en producción.')

    doc.core_properties.title = 'Manual completo del proyecto PList'
    doc.core_properties.subject = 'Guía de uso, mantenimiento y evolución de PList'
    doc.core_properties.author = 'PList'
    doc.core_properties.keywords = 'PList, Supabase, GitHub Pages, PWA, Web Push, listas de compra, recetas'
    doc.save(DOCX)
    print(DOCX)

if __name__ == '__main__':
    build()
