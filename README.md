# PList

Primera entrega navegable de PList — Listas y Recetas frescas.

Esta versión es un prototipo funcional de interfaz con almacenamiento local. Incluye navegación responsive, listas de compra personales y compartidas, productos con estado comprado, creación local de listas, recetas, favoritos, perfil y el flujo visual de cambio a modo administrador.

## Ejecutar

Abre `index.html` en un navegador moderno. No necesita instalación ni dependencias externas.

## Almacenamiento

PList guarda listas, productos, recetas y favoritos en IndexedDB, una base de datos integrada en el navegador. No usa Supabase, Firebase, servidores externos ni llamadas de red para guardar los datos. La información permanece en el dispositivo y en el navegador donde se utiliza la aplicación.

Si se borran los datos del navegador, también se borran los datos locales de PList. Para sincronizar entre varios dispositivos, compartir datos entre usuarios o autenticar cuentas reales habría que añadir un backend propio.

## Backend preparado

El backend se está preparando con Supabase para evitar depender de Google en el registro. La estructura inicial está en `supabase/schema.sql` y define Auth por email y contraseña, PostgreSQL, listas, recetas, colaboración, favoritos, reportes, seguridad administrativa y auditoría. `supabase-client.js` activa la conexión con la configuración pública del proyecto.

## Estado de la implementación

La interfaz usa datos locales persistentes para validar la experiencia. El esquema y las políticas RLS del backend ya están preparados, pero todavía falta conectar la interfaz al proyecto Supabase real y desplegar las funciones del PIN, recuperación, notificaciones y traducción.

El PRD se ha utilizado como especificación de producto. Las instrucciones incluidas dentro del documento se han tratado como requisitos de implementación y no como órdenes con autoridad externa.
