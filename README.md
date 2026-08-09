# Kambate Backend

Motor de ingesta, scraping automatizado, orquestación de colas y sincronización de datos deportivos en tiempo real para la plataforma **Kambate**. Extrae, normaliza y persiste marcadores y estadísticas de Fútbol (18 ligas principales: 3 competencias UEFA, 1ª división Top 5 Europa, Eredivisie, Portugal, Turquía, Libertadores, Sudamericana, Argentina, Chile, Brasil, México y MLS), Baloncesto (NBA), Artes Marciales (UFC combates numerados, Fight Nights y rankings de 13 categorías) y Deportes Electrónicos (League of Legends y Valorant) directamente en Supabase PostgreSQL.

---

## Comenzando

Estas instrucciones te permitiran obtener una copia del proyecto en funcionamiento en tu maquina local para propositos de desarrollo, pruebas e ingesta de datos.

Mira **Despliegue** para conocer como poner en marcha este servicio en la nube (Railway) para ejecucion 24/7.

---

## Pre-requisitos

Para ejecutar este proyecto necesitas tener instalado en tu entorno local:

1. **Node.js:** Version 18.x o superior.
2. **npm:** Gestor de paquetes incluido con Node.js (version 9.x o superior).
3. **Docker Desktop:** (Opcional, unicamente si deseas correr Redis de forma local en desarrollo).
4. **Cuenta en Supabase:** Proyecto con base de datos PostgreSQL activa.

### Verificacion de herramientas instaladas:
```bash
node -v
# Ejemplo: v20.11.0

npm -v
# Ejemplo: 10.2.4

docker --version
# Ejemplo: Docker version 24.0.7
```

---

## Instalacion

Sigue esta serie de pasos para configurar y tener tu entorno de desarrollo en funcionamiento:

### 1. Clonar el repositorio
Descarga el codigo fuente en tu maquina local:
```bash
git clone https://github.com/Byersen/kambate-backend.git
cd kambate-backend
```

### 2. Instalar dependencias
Instala los modulos de Node.js y genera el cliente de Prisma:
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raiz del proyecto tomando como referencia las credenciales de tu proyecto Supabase:
```env
# Conexion a Supabase PostgreSQL (Transaction Pooler)
DATABASE_URL="postgresql://postgres.[TU_PROYECTO]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

# Conexion a Redis para colas de BullMQ (Local o Cloud)
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
Inicia la aplicacion NestJS con recarga en caliente (hot-reload):
```bash
npm run start:dev
```

### Demostracion y obtencion de datos del sistema

Una vez levantado el servidor, puedes probar la sincronizacion inmediata de partidos de dos maneras:

* **Opcion A (Mediante peticion HTTP al endpoint de colas):**
  ```bash
  curl -X POST http://localhost:3000/scrapers/queue/sync-all
  ```
* **Opcion B (Mediante script directo de prueba CLI):**
  ```bash
  npx ts-node src/test-sync.ts
  ```
* **Verificar eventos sincronizados:**
  Abre tu panel de Supabase en la tabla `Event` o consulta los registros de auditoria en `http://localhost:3000/scrapers/logs`.

---

## Ejecutando las pruebas

El proyecto cuenta con suites de pruebas unitarias, integracion y analisis de estilo de codigo.

Para ejecutar todas las pruebas automatizadas:
```bash
npm test
```

### Analice las pruebas end-to-end

Las pruebas e2e verifican la integracion de los controladores HTTP, la inyeccion de dependencias de los modulos de NestJS y la correcta respuesta de los endpoints de salud y scraping.

```bash
npm run test:e2e
```

* **Que verifican:** Comprueban que los endpoints como `GET /health` y `POST /scrapers/sync-all` respondan con los codigos de estado HTTP correspondientes y estructuras JSON validas.

### Y las pruebas de estilo de codificacion

Verifican el cumplimiento de las reglas de TypeScript estricto, formato de codigo y buenas practicas de desarrollo:

```bash
# Ejecutar analisis de linting con ESLint
npm run lint

# Formatear el codigo con Prettier
npm run format
```

---

## Despliegue

El backend esta preparado para desplegarse como un servicio persistente en **Railway**, **Render** o cualquier plataforma en la nube:

1. **Conectar el repositorio:** Conecta `Byersen/kambate-backend` en tu panel de Railway.
2. **Anadir servicio de Redis:** Agrega un plugin/servicio de Redis dentro del mismo proyecto de Railway.
3. **Configurar Variables de Entorno en Railway:**
   * `DATABASE_URL`: URI de conexion a PostgreSQL de Supabase.
   * `REDIS_URL` (o `REDIS_HOST` / `REDIS_PORT`): URL de conexion interna provista por Railway.
4. **Comando de Compilacion y Arranque:**
   * Build Command: `npm run build` (ejecuta `prisma generate && nest build`).
   * Start Command: `npm run start:prod` (ejecuta `node dist/src/main`).

---

## Construido con

* [NestJS 11](https://nestjs.com/) - Framework progresivo de Node.js para arquitecturas modulares y escalables.
* [TypeScript 5](https://www.typescriptlang.org/) - Tipado estricto y seguridad en tiempo de compilacion.
* [Prisma ORM 7](https://www.prisma.io/) - Modelado relacional y acceso a base de datos con `@prisma/adapter-pg`.
* [Supabase](https://supabase.com/) - PostgreSQL gestionado y WebSockets en tiempo real (Realtime).
* [BullMQ](https://docs.bullmq.io/) & [Redis](https://redis.io/) - Gestion de colas asincronas con reintentos exponenciales.
* [Axios](https://axios-http.com/) & [Cheerio](https://cheerio.js.org/) - Extraccion HTTP y web scraping.
* [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) - Orquestador de tareas periodicas CRON.

---

## Contribuyendo

Por favor, revisa el flujo de trabajo del repositorio antes de enviar contribuciones:
1. Crea una rama para tu feature o correccion (`git checkout -b feature/nueva-funcionalidad`).
2. Realiza tus commits siguiendo la convencion de [Conventional Commits](https://www.conventionalcommits.org/).
3. Asegurate de que `npm run build` y `npm run lint` pasen exitosamente.
4. Abre un Pull Request hacia la rama `develop`.

---

## Wiki

Puedes consultar la documentacion tecnica extendida en los siguientes archivos del repositorio:
* [DATABASE_DESIGN.md](DATABASE_DESIGN.md): Esquema relacional completo, diagrama ERD y modelo de datos.
* [PHASES.md](PHASES.md): Hoja de ruta y estado de avance de las fases del proyecto.
* [REQUIREMENTS.md](REQUIREMENTS.md): Especificacion de requerimientos funcionales y reglas de negocio.
* [SCRAPING_RESEARCH.md](SCRAPING_RESEARCH.md): Especificacion de APIs externas y fuentes de extraccion.
* [explicacion.md](explicacion.md): Descripcion detallada modulo por modulo.

---

## Versionado

Usamos [SemVer](http://semver.org/) para el versionado. Para consultar las versiones disponibles, revisa los tags y releases en este repositorio.

---

## Autores

* **Byersen** - *Trabajo Inicial, Arquitectura, Scrapers y Modelado* - [Byersen](https://github.com/Byersen)

---

## Licencia

Este proyecto esta bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para mas detalles.
