# Kambate Backend ⚙️

Motor de ingesta, scraping automatizado, orquestación de colas y sincronización de datos deportivos en tiempo real para la plataforma **Kambate**. Extrae, normaliza y persiste marcadores y estadísticas de Fútbol (UEFA Champions League, LaLiga, Premier League, Serie A, Copa Libertadores), Baloncesto (NBA), Artes Marciales (UFC) y Deportes Electrónicos (League of Legends y Valorant) directamente en Supabase PostgreSQL.

---

## Comenzando 🚀

Estas instrucciones te permitirán obtener una copia del proyecto en funcionamiento en tu máquina local para propósitos de desarrollo, pruebas e ingesta de datos.

Mira **Despliegue** para conocer cómo poner en marcha este servicio en la nube (Railway) para ejecución 24/7.

---

## Pre-requisitos 📋

Para ejecutar este proyecto necesitas tener instalado en tu entorno local:

1. **Node.js:** Versión 18.x o superior.
2. **npm:** Gestor de paquetes incluido con Node.js (versión 9.x o superior).
3. **Docker Desktop:** (Opcional, únicamente si deseas correr Redis de forma local en desarrollo).
4. **Cuenta en Supabase:** Proyecto con base de datos PostgreSQL activa.

### Verificación de herramientas instaladas:
```bash
node -v
# Ejemplo: v20.11.0

npm -v
# Ejemplo: 10.2.4

docker --version
# Ejemplo: Docker version 24.0.7
```

---

## Instalación 🔧

Sigue esta serie de pasos para configurar y tener tu entorno de desarrollo en funcionamiento:

### 1. Clonar el repositorio
Descarga el código fuente en tu máquina local:
```bash
git clone https://github.com/Byersen/kambate-backend.git
cd kambate-backend
```

### 2. Instalar dependencias
Instala los módulos de Node.js y genera el cliente de Prisma:
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto tomando como referencia las credenciales de tu proyecto Supabase:
```env
# Conexión a Supabase PostgreSQL (Transaction Pooler)
DATABASE_URL="postgresql://postgres.[TU_PROYECTO]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

# Conexión a Redis para colas de BullMQ (Local o Cloud)
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# Puerto del servidor NestJS
PORT=3000
```

### 4. Sincronizar el esquema con Supabase
Aplica los modelos de datos en PostgreSQL:
```bash
npx prisma db push
```

### 5. Iniciar el servicio de Redis (Local con Docker)
Si realizas pruebas de colas en local, levanta el contenedor de Redis:
```bash
docker compose up -d
```

### 6. Ejecutar el servidor en modo desarrollo
Inicia la aplicación NestJS con recarga en caliente (*hot-reload*):
```bash
npm run start:dev
```

### Demostración y obtención de datos del sistema 📊

Una vez levantado el servidor, puedes probar la sincronización inmediata de partidos de dos maneras:

* **Opción A (Mediante petición HTTP al endpoint de colas):**
  ```bash
  curl -X POST http://localhost:3000/scrapers/queue/sync-all
  ```
* **Opción B (Mediante script directo de prueba CLI):**
  ```bash
  npx ts-node src/test-sync.ts
  ```
* **Verificar eventos sincronizados:**
  Abre tu panel de Supabase en la tabla `Event` o consulta los registros de auditoría en `http://localhost:3000/scrapers/logs`.

---

## Ejecutando las pruebas ⚙️

El proyecto cuenta con suites de pruebas unitarias, integración y análisis de estilo de código.

Para ejecutar todas las pruebas automatizadas:
```bash
npm test
```

### Analice las pruebas end-to-end 🔩

Las pruebas e2e verifican la integración de los controladores HTTP, la inyección de dependencias de los módulos de NestJS y la correcta respuesta de los endpoints de salud y scraping.

```bash
npm run test:e2e
```

* **Qué verifican:** Comprueban que los endpoints como `GET /health` y `POST /scrapers/sync-all` respondan con los códigos de estado HTTP correspondientes y estructuras JSON válidas.

### Y las pruebas de estilo de codificación ⌨️

Verifican el cumplimiento de las reglas de TypeScript estricto, formato de código y buenas prácticas de desarrollo:

```bash
# Ejecutar análisis de linting con ESLint
npm run lint

# Formatear el código con Prettier
npm run format
```

---

## Despliegue 📦

El backend está preparado para desplegarse como un servicio persistente en **Railway**, **Render** o cualquier plataforma en la nube:

1. **Conectar el repositorio:** Conecta `Byersen/kambate-backend` en tu panel de Railway.
2. **Añadir servicio de Redis:** Agrega un plugin/servicio de Redis dentro del mismo proyecto de Railway.
3. **Configurar Variables de Entorno en Railway:**
   * `DATABASE_URL`: URI de conexión a PostgreSQL de Supabase.
   * `REDIS_URL` (o `REDIS_HOST` / `REDIS_PORT`): URL de conexión interna provista por Railway.
4. **Comando de Compilación y Arranque:**
   * Build Command: `npm run build` *(ejecuta `prisma generate && nest build`)*.
   * Start Command: `npm run start:prod` *(ejecuta `node dist/src/main`)*.

---

## Construido con 🛠️

* [NestJS 11](https://nestjs.com/) - Framework progresivo de Node.js para arquitecturas modulares y escalables.
* [TypeScript 5](https://www.typescriptlang.org/) - Tipado estricto y seguridad en tiempo de compilación.
* [Prisma ORM 7](https://www.prisma.io/) - Modelado relacional y acceso a base de datos con `@prisma/adapter-pg`.
* [Supabase](https://supabase.com/) - PostgreSQL gestionado y WebSockets en tiempo real (*Realtime*).
* [BullMQ](https://docs.bullmq.io/) & [Redis](https://redis.io/) - Gestión de colas asíncronas con reintentos exponenciales.
* [Axios](https://axios-http.com/) & [Cheerio](https://cheerio.js.org/) - Extracción HTTP y web scraping.
* [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) - Orquestador de tareas periódicas CRON.

---

## Contribuyendo 🖇️

Por favor, revisa el flujo de trabajo del repositorio antes de enviar contribuciones:
1. Crea una rama para tu feature o corrección (`git checkout -b feature/nueva-funcionalidad`).
2. Realiza tus commits siguiendo la convención de [Conventional Commits](https://www.conventionalcommits.org/).
3. Asegúrate de que `npm run build` y `npm run lint` pasen exitosamente.
4. Abre un Pull Request hacia la rama `develop`.

---

## Wiki 📖

Puedes consultar la documentación técnica extendida en los siguientes archivos del repositorio:
* [DATABASE_DESIGN.md](DATABASE_DESIGN.md): Esquema relacional completo, diagrama ERD y modelo de datos.
* [PHASES.md](PHASES.md): Hoja de ruta y estado de avance de las fases del proyecto.
* [REQUIREMENTS.md](REQUIREMENTS.md): Especificación de requerimientos funcionales y reglas de negocio.
* [SCRAPING_RESEARCH.md](SCRAPING_RESEARCH.md): Especificación de APIs externas y fuentes de extracción.
* [explicacion.md](explicacion.md): Descripción detallada módulo por módulo.

---

## Versionado 📌

Usamos [SemVer](http://semver.org/) para el versionado. Para consultar las versiones disponibles, revisa los tags y releases en este repositorio.

---

## Autores ✒️

* **Byersen** - *Trabajo Inicial, Arquitectura, Scrapers y Modelado* - [Byersen](https://github.com/Byersen)

---

## Licencia 📄

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.

---
