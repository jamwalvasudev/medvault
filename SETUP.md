# Setup Guide

## Prerequisites

- Java 21+
- Node.js 20+
- Docker (for local PostgreSQL + MinIO)
- A Google Cloud project with OAuth2 credentials

## Local Development

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- MinIO (S3-compatible) on port 9000 (console: 9001)

### 2. Configure secrets

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

Required values in `.env.local`:

```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
JWT_SECRET=<random-256-bit-hex-string>
VAPID_PUBLIC_KEY=<base64url VAPID public key>
VAPID_PRIVATE_KEY=<base64url VAPID private key>
```

Generate a JWT secret:
```bash
openssl rand -hex 32
```

Generate VAPID keys (requires web-push CLI):
```bash
npx web-push generate-vapid-keys
```

### 3. Create MinIO bucket

Open the MinIO console at http://localhost:9001 (admin/password), create a bucket named `medhistory`.

### 4. Start the application

```bash
make dev
```

This starts the backend (`:8080`) and frontend dev server (`:5173`) together and tails their logs. Press `Ctrl+C` to stop tailing — services keep running. Use `make stop` to shut them down.

Alternatively, run them separately:
- Backend: `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend: `cd frontend && npm run dev`

### 6. Sign in

Open http://localhost:5173, click "Sign in with Google", and complete the OAuth flow.

---

## Production Build

Build a single fat JAR that includes the frontend:

```bash
./mvnw package -DskipTests
java -jar target/medhistory.jar
```

---

## Deployment (Fly.io)

### First-time setup

```bash
fly auth login
fly apps create medhistory
fly postgres create --name medhistory-db
fly postgres attach medhistory-db --app medhistory
```

Create a bucket on Cloudflare R2 and get the API credentials.

### Set secrets

```bash
fly secrets set \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" \
  S3_REGION="auto" \
  S3_BUCKET="medhistory" \
  S3_ACCESS_KEY="..." \
  S3_SECRET_KEY="..." \
  APP_BASE_URL="https://medhistory.fly.dev"
```

### Deploy

```bash
fly deploy
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - Local: `http://localhost:8080/login/oauth2/code/google`
   - Production: `https://medhistory.fly.dev/login/oauth2/code/google`
4. Copy the client ID and secret to your `.env.local`

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret |
| `JWT_SECRET` | HMAC-SHA256 signing key (hex) |
| `VAPID_PUBLIC_KEY` | VAPID public key (base64url) |
| `VAPID_PRIVATE_KEY` | VAPID private key (base64url) |
| `S3_ENDPOINT` | S3/R2 endpoint URL |
| `S3_REGION` | S3 region (use `auto` for R2) |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `APP_BASE_URL` | Public URL (for OAuth redirects) |
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL |
