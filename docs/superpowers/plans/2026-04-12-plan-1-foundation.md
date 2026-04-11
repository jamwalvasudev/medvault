# Medical History Manager — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a running Spring Boot application with Google OAuth2 login, JWT session cookies, a fully-migrated PostgreSQL schema (including Envers audit tables), structured logging, Prometheus metrics, and a working local dev environment via Docker Compose.

**Architecture:** Single Spring Boot 3.x Maven project. Google OAuth2 handled by Spring Security; on success a JWT is issued as an httpOnly cookie. All schema managed by Flyway (no Hibernate DDL auto). Hibernate Envers audits all domain entities. Micrometer + Prometheus expose metrics. A correlation ID filter adds a UUID to every request's MDC.

**Tech Stack:** Java 21 · Spring Boot 3.3.x · Spring Security 6 · OAuth2 Client · jjwt 0.12.x · Hibernate Envers · Flyway · PostgreSQL 16 · Micrometer/Prometheus · Logback (JSON prod / readable local) · Docker Compose (Postgres + MinIO)

---

## File Map

| Path | Purpose |
|------|---------|
| `pom.xml` | Maven build — all dependencies, no frontend plugin yet (Plan 3) |
| `docker-compose.yml` | Postgres 16 + MinIO (S3-compatible) for local dev |
| `.gitignore` | Java + Node + IDE + secrets |
| `.env.local.example` | Template listing every required local env var |
| `src/main/java/com/medhistory/MedhistoryApplication.java` | Spring Boot entry point |
| `src/main/java/com/medhistory/config/SecurityConfig.java` | HTTP security, JWT filter, OAuth2 wiring |
| `src/main/java/com/medhistory/config/WebConfig.java` | CORS + SPA fallback (non-API → index.html) |
| `src/main/java/com/medhistory/config/JpaAuditConfig.java` | `@EnableJpaAuditing` + Envers listener registration |
| `src/main/java/com/medhistory/auth/JwtService.java` | Generate + validate JWT |
| `src/main/java/com/medhistory/auth/JwtFilter.java` | Read JWT cookie → set SecurityContext |
| `src/main/java/com/medhistory/auth/OAuth2SuccessHandler.java` | Post-OAuth: upsert User, issue cookie, redirect |
| `src/main/java/com/medhistory/auth/AuditorAwareImpl.java` | Supplies current user UUID for `@CreatedBy`/`@LastModifiedBy` |
| `src/main/java/com/medhistory/auth/CustomRevisionEntity.java` | Envers REVINFO extension with `modified_by` |
| `src/main/java/com/medhistory/auth/CustomRevisionListener.java` | Populates `modified_by` from SecurityContext |
| `src/main/java/com/medhistory/auth/SecurityUtils.java` | `getCurrentUserId()` helper |
| `src/main/java/com/medhistory/common/BaseAuditEntity.java` | `@MappedSuperclass` with 4 audit fields |
| `src/main/java/com/medhistory/common/CorrelationIdFilter.java` | UUID per request in MDC + `X-Correlation-Id` response header |
| `src/main/java/com/medhistory/user/User.java` | User entity |
| `src/main/java/com/medhistory/user/UserRepository.java` | `findByGoogleId`, `findByEmail` |
| `src/main/java/com/medhistory/user/UserService.java` | `upsertFromOAuth2`, `getById` |
| `src/main/java/com/medhistory/user/UserController.java` | `GET /api/users/me` |
| `src/main/java/com/medhistory/user/UserResponse.java` | DTO |
| `src/main/resources/application.yml` | Common config |
| `src/main/resources/application-local.yml` | Local overrides |
| `src/main/resources/application-prod.yml` | Prod overrides (env vars) |
| `src/main/resources/logback-spring.xml` | JSON (prod) / readable (local) |
| `src/main/resources/db/migration/V1__create_users.sql` | users table + REVINFO + user_aud |
| `src/main/resources/db/migration/V2__create_domain_tables.sql` | visits, medications, recommendations, attachments, reminders, push_subscriptions — all with audit columns |
| `src/main/resources/db/migration/V3__create_audit_tables.sql` | All `_aud` shadow tables for domain entities |
| `src/main/resources/db/migration/V4__add_search_vector.sql` | tsvector column, update function, trigger, GIN index |
| `src/test/java/com/medhistory/auth/JwtServiceTest.java` | Unit tests for JWT generation + validation |
| `src/test/java/com/medhistory/user/UserServiceTest.java` | Unit tests for user upsert logic |
| `src/test/java/com/medhistory/user/UserControllerTest.java` | `@WebMvcTest` for GET /api/users/me |
| `src/test/resources/application-test.yml` | H2 in-memory DB for unit/slice tests |

---

## Task 1: Maven Project Skeleton

**Files:**
- Create: `pom.xml`
- Create: `src/main/java/com/medhistory/MedhistoryApplication.java`
- Create: `.gitignore`

- [ ] **Step 1: Create the Maven project structure**

```bash
mkdir -p src/main/java/com/medhistory
mkdir -p src/main/resources/db/migration
mkdir -p src/test/java/com/medhistory
mkdir -p src/test/resources
```

- [ ] **Step 2: Create `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <groupId>com.medhistory</groupId>
    <artifactId>medhistory</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>medhistory</name>
    <description>Personal medical history manager</description>

    <properties>
        <java.version>21</java.version>
        <jjwt.version>0.12.5</jjwt.version>
        <awssdk.version>2.25.40</awssdk.version>
        <logstash.version>7.4</logstash.version>
        <testcontainers.version>1.19.8</testcontainers.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>software.amazon.awssdk</groupId>
                <artifactId>bom</artifactId>
                <version>${awssdk.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.testcontainers</groupId>
                <artifactId>testcontainers-bom</artifactId>
                <version>${testcontainers.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- JPA + Hibernate -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- Envers -->
        <dependency>
            <groupId>org.hibernate.orm</groupId>
            <artifactId>hibernate-envers</artifactId>
        </dependency>

        <!-- Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-client</artifactId>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Actuator + Prometheus -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>

        <!-- PostgreSQL -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Flyway -->
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- AWS SDK v2 (R2/MinIO) -->
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>s3</artifactId>
        </dependency>

        <!-- Web Push -->
        <dependency>
            <groupId>nl.martijndwars</groupId>
            <artifactId>web-push</artifactId>
            <version>5.1.1</version>
        </dependency>
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk15on</artifactId>
            <version>1.70</version>
        </dependency>

        <!-- Structured Logging -->
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>${logstash.version}</version>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <finalName>medhistory</finalName>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 3: Create `src/main/java/com/medhistory/MedhistoryApplication.java`**

```java
package com.medhistory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MedhistoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(MedhistoryApplication.class, args);
    }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
# Maven
target/
*.jar
*.war

# IDE
.idea/
*.iml
.vscode/
*.class

# Secrets
.env
.env.local
*.env

# Frontend
frontend/node_modules/
frontend/dist/

# OS
.DS_Store
```

- [ ] **Step 5: Verify the project compiles**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add pom.xml src/main/java/com/medhistory/MedhistoryApplication.java .gitignore
git commit -m "feat: initialize Spring Boot project skeleton"
```

---

## Task 2: Docker Compose + Environment Template

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.local.example`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: medhistory-postgres
    environment:
      POSTGRES_DB: medhistory
      POSTGRES_USER: medhistory
      POSTGRES_PASSWORD: medhistory
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medhistory"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: medhistory-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres-data:
  minio-data:
```

- [ ] **Step 2: Create `.env.local.example`**

```bash
# Copy this file to .env.local and fill in values.
# .env.local is gitignored and never committed.

# Google OAuth2 — register at https://console.cloud.google.com
# Authorized redirect URI: http://localhost:8080/login/oauth2/code/google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT — generate with: openssl rand -base64 64
JWT_SECRET=change-me-to-a-long-random-base64-string

# VAPID keys — generate with the helper in SETUP.md
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# R2/MinIO (local values below work with docker-compose)
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY=minioadmin
R2_SECRET_KEY=minioadmin
R2_BUCKET=medhistory
```

- [ ] **Step 3: Start Docker Compose and verify both services are up**

```bash
docker compose up -d
docker compose ps
```

Expected: both `medhistory-postgres` and `medhistory-minio` show status `healthy`.

- [ ] **Step 4: Create the MinIO bucket**

```bash
docker exec medhistory-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec medhistory-minio mc mb local/medhistory
```

Expected: `Bucket created successfully 'local/medhistory'.`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.local.example
git commit -m "feat: add Docker Compose for local Postgres + MinIO"
```

---

## Task 3: Application Configuration + Logback

**Files:**
- Create: `src/main/resources/application.yml`
- Create: `src/main/resources/application-local.yml`
- Create: `src/main/resources/application-prod.yml`
- Create: `src/main/resources/logback-spring.xml`
- Create: `src/test/resources/application-test.yml`

- [ ] **Step 1: Create `src/main/resources/application.yml`**

```yaml
spring:
  application:
    name: medhistory
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  flyway:
    enabled: true
    locations: classpath:db/migration

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true

server:
  port: 8080
  servlet:
    context-path: /

app:
  jwt:
    expiration-ms: 86400000   # 24 hours
  frontend:
    url: http://localhost:5173
```

- [ ] **Step 2: Create `src/main/resources/application-local.yml`**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/medhistory
    username: medhistory
    password: medhistory
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid,email,profile
        provider:
          google:
            issuer-uri: https://accounts.google.com
  jpa:
    show-sql: true

logging:
  level:
    com.medhistory: DEBUG
    org.hibernate.SQL: DEBUG
    org.springframework.security: DEBUG

app:
  jwt:
    secret: ${JWT_SECRET}
  vapid:
    public-key: ${VAPID_PUBLIC_KEY}
    private-key: ${VAPID_PRIVATE_KEY}
  storage:
    endpoint: ${R2_ENDPOINT:http://localhost:9000}
    access-key: ${R2_ACCESS_KEY:minioadmin}
    secret-key: ${R2_SECRET_KEY:minioadmin}
    bucket: ${R2_BUCKET:medhistory}
    path-style-access: true   # required for MinIO
  cors:
    allowed-origins: http://localhost:5173
```

- [ ] **Step 3: Create `src/main/resources/application-prod.yml`**

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid,email,profile
        provider:
          google:
            issuer-uri: https://accounts.google.com

logging:
  level:
    com.medhistory: INFO

app:
  jwt:
    secret: ${JWT_SECRET}
  vapid:
    public-key: ${VAPID_PUBLIC_KEY}
    private-key: ${VAPID_PRIVATE_KEY}
  storage:
    endpoint: ${R2_ENDPOINT}
    access-key: ${R2_ACCESS_KEY}
    secret-key: ${R2_SECRET_KEY}
    bucket: ${R2_BUCKET}
    path-style-access: false
  cors:
    allowed-origins: ${FRONTEND_URL}
  frontend:
    url: ${FRONTEND_URL}
```

- [ ] **Step 4: Create `src/main/resources/logback-spring.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProfile name="local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} [%X{correlationId}] - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>correlationId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON_CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

- [ ] **Step 5: Create `src/test/resources/application-test.yml`**

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
    database-platform: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false   # H2 doesn't support all Postgres SQL in migrations

app:
  jwt:
    secret: test-secret-that-is-at-least-32-characters-long-for-hs256
    expiration-ms: 86400000
  vapid:
    public-key: test-vapid-public-key
    private-key: test-vapid-private-key
  storage:
    endpoint: http://localhost:9000
    access-key: minioadmin
    secret-key: minioadmin
    bucket: medhistory
    path-style-access: true
  cors:
    allowed-origins: http://localhost:5173
```

- [ ] **Step 6: Compile and confirm no config errors**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/ src/test/resources/
git commit -m "feat: add application profiles and logback configuration"
```

---

## Task 4: Flyway Migrations

**Files:**
- Create: `src/main/resources/db/migration/V1__create_users.sql`
- Create: `src/main/resources/db/migration/V2__create_domain_tables.sql`
- Create: `src/main/resources/db/migration/V3__create_audit_tables.sql`
- Create: `src/main/resources/db/migration/V4__add_search_vector.sql`

- [ ] **Step 1: Create `V1__create_users.sql`**

```sql
-- Envers revision info table (custom with modified_by)
CREATE TABLE revinfo (
    rev        BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    revtstmp   BIGINT NOT NULL,
    modified_by UUID
);

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id       VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(512),
    created_by      UUID,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    modified_by     UUID,
    modified_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- Envers audit table for users
CREATE TABLE users_aud (
    id              UUID         NOT NULL,
    rev             BIGINT       NOT NULL REFERENCES revinfo(rev),
    revtype         SMALLINT,
    google_id       VARCHAR(255),
    email           VARCHAR(255),
    name            VARCHAR(255),
    profile_picture VARCHAR(512),
    created_by      UUID,
    created_at      TIMESTAMP,
    modified_by     UUID,
    modified_at     TIMESTAMP,
    PRIMARY KEY (id, rev)
);
```

- [ ] **Step 2: Create `V2__create_domain_tables.sql`**

```sql
-- Visits
CREATE TABLE visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visit_date      DATE NOT NULL,
    doctor_name     VARCHAR(255),
    specialty       VARCHAR(255),
    clinic          VARCHAR(255),
    chief_complaint TEXT,
    diagnosis       TEXT,
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    modified_by     UUID,
    modified_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_visit_date ON visits(visit_date DESC);

-- Medications
CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    dosage          VARCHAR(255),
    frequency       VARCHAR(255),
    duration_days   INTEGER,
    worked          VARCHAR(20) CHECK (worked IN ('yes','no','partial')),
    side_effects    TEXT,
    would_use_again BOOLEAN,
    created_by      UUID,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    modified_by     UUID,
    modified_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_visit_id ON medications(visit_id);

-- Recommendations
CREATE TABLE recommendations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id    UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('physical','diet','other')),
    description TEXT NOT NULL,
    created_by  UUID,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    modified_by UUID,
    modified_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_visit_id ON recommendations(visit_id);

-- Attachments
CREATE TABLE attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id     UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    r2_key       VARCHAR(512) NOT NULL,
    file_type    VARCHAR(20) CHECK (file_type IN ('prescription','report','imaging','other')),
    content_type VARCHAR(127),
    size_bytes   BIGINT,
    created_by   UUID,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    modified_by  UUID,
    modified_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_visit_id ON attachments(visit_id);

-- Medication reminders
CREATE TABLE medication_reminders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT true,
    last_sent_at  TIMESTAMP,
    created_by    UUID,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    modified_by   UUID,
    modified_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_user_id ON medication_reminders(user_id);
CREATE INDEX idx_reminders_active ON medication_reminders(active, reminder_time);

-- Push subscriptions
CREATE TABLE push_subscriptions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     VARCHAR(512) NOT NULL,
    auth       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

- [ ] **Step 3: Create `V3__create_audit_tables.sql`**

```sql
-- Envers audit tables for domain entities

CREATE TABLE visits_aud (
    id              UUID     NOT NULL,
    rev             BIGINT   NOT NULL REFERENCES revinfo(rev),
    revtype         SMALLINT,
    user_id         UUID,
    visit_date      DATE,
    doctor_name     VARCHAR(255),
    specialty       VARCHAR(255),
    clinic          VARCHAR(255),
    chief_complaint TEXT,
    diagnosis       TEXT,
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMP,
    modified_by     UUID,
    modified_at     TIMESTAMP,
    PRIMARY KEY (id, rev)
);

CREATE TABLE medications_aud (
    id              UUID     NOT NULL,
    rev             BIGINT   NOT NULL REFERENCES revinfo(rev),
    revtype         SMALLINT,
    visit_id        UUID,
    name            VARCHAR(255),
    dosage          VARCHAR(255),
    frequency       VARCHAR(255),
    duration_days   INTEGER,
    worked          VARCHAR(20),
    side_effects    TEXT,
    would_use_again BOOLEAN,
    created_by      UUID,
    created_at      TIMESTAMP,
    modified_by     UUID,
    modified_at     TIMESTAMP,
    PRIMARY KEY (id, rev)
);

CREATE TABLE recommendations_aud (
    id          UUID     NOT NULL,
    rev         BIGINT   NOT NULL REFERENCES revinfo(rev),
    revtype     SMALLINT,
    visit_id    UUID,
    type        VARCHAR(20),
    description TEXT,
    created_by  UUID,
    created_at  TIMESTAMP,
    modified_by UUID,
    modified_at TIMESTAMP,
    PRIMARY KEY (id, rev)
);

CREATE TABLE attachments_aud (
    id           UUID     NOT NULL,
    rev          BIGINT   NOT NULL REFERENCES revinfo(rev),
    revtype      SMALLINT,
    visit_id     UUID,
    display_name VARCHAR(255),
    r2_key       VARCHAR(512),
    file_type    VARCHAR(20),
    content_type VARCHAR(127),
    size_bytes   BIGINT,
    created_by   UUID,
    created_at   TIMESTAMP,
    modified_by  UUID,
    modified_at  TIMESTAMP,
    PRIMARY KEY (id, rev)
);

CREATE TABLE medication_reminders_aud (
    id            UUID     NOT NULL,
    rev           BIGINT   NOT NULL REFERENCES revinfo(rev),
    revtype       SMALLINT,
    medication_id UUID,
    user_id       UUID,
    reminder_time TIME,
    active        BOOLEAN,
    last_sent_at  TIMESTAMP,
    created_by    UUID,
    created_at    TIMESTAMP,
    modified_by   UUID,
    modified_at   TIMESTAMP,
    PRIMARY KEY (id, rev)
);
```

- [ ] **Step 4: Create `V4__add_search_vector.sql`**

```sql
ALTER TABLE visits ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_visit_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        coalesce(NEW.doctor_name, '') || ' ' ||
        coalesce(NEW.specialty, '')   || ' ' ||
        coalesce(NEW.diagnosis, '')   || ' ' ||
        coalesce(NEW.chief_complaint, '') || ' ' ||
        coalesce(NEW.notes, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_search_vector_update
    BEFORE INSERT OR UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_visit_search_vector();

CREATE INDEX idx_visits_search_vector ON visits USING GIN(search_vector);
```

- [ ] **Step 5: Run migrations against the local database**

```bash
mvn flyway:migrate -Dspring.profiles.active=local \
  -Dspring.datasource.url=jdbc:postgresql://localhost:5432/medhistory \
  -Dspring.datasource.username=medhistory \
  -Dspring.datasource.password=medhistory
```

Expected: `Successfully applied 4 migrations`

- [ ] **Step 6: Verify tables exist**

```bash
docker exec -it medhistory-postgres psql -U medhistory -d medhistory \
  -c "\dt" | grep -E "visits|medications|recommendations|attachments|reminders|push|revinfo|aud"
```

Expected: all 12+ tables listed.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/
git commit -m "feat: add Flyway migrations for all domain and audit tables"
```

---

## Task 5: Base Audit Entity + Envers Configuration

**Files:**
- Create: `src/main/java/com/medhistory/common/BaseAuditEntity.java`
- Create: `src/main/java/com/medhistory/auth/AuditorAwareImpl.java`
- Create: `src/main/java/com/medhistory/auth/CustomRevisionEntity.java`
- Create: `src/main/java/com/medhistory/auth/CustomRevisionListener.java`
- Create: `src/main/java/com/medhistory/auth/SecurityUtils.java`
- Create: `src/main/java/com/medhistory/config/JpaAuditConfig.java`

- [ ] **Step 1: Create `SecurityUtils.java`**

```java
package com.medhistory.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<UUID> getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(auth.getName()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 2: Create `AuditorAwareImpl.java`**

```java
package com.medhistory.auth;

import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("auditorAware")
public class AuditorAwareImpl implements AuditorAware<UUID> {

    @Override
    public Optional<UUID> getCurrentAuditor() {
        return SecurityUtils.getCurrentUserId();
    }
}
```

- [ ] **Step 3: Create `CustomRevisionEntity.java`**

```java
package com.medhistory.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

import java.util.UUID;

@Entity
@Table(name = "revinfo")
@RevisionEntity(CustomRevisionListener.class)
public class CustomRevisionEntity extends DefaultRevisionEntity {

    @Column(name = "modified_by")
    private UUID modifiedBy;

    public UUID getModifiedBy() { return modifiedBy; }
    public void setModifiedBy(UUID modifiedBy) { this.modifiedBy = modifiedBy; }
}
```

- [ ] **Step 4: Create `CustomRevisionListener.java`**

```java
package com.medhistory.auth;

import org.hibernate.envers.RevisionListener;

public class CustomRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        CustomRevisionEntity revision = (CustomRevisionEntity) revisionEntity;
        SecurityUtils.getCurrentUserId().ifPresent(revision::setModifiedBy);
    }
}
```

- [ ] **Step 5: Create `BaseAuditEntity.java`**

```java
package com.medhistory.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseAuditEntity {

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @LastModifiedBy
    @Column(name = "modified_by")
    private UUID modifiedBy;

    @LastModifiedDate
    @Column(name = "modified_at", nullable = false)
    private Instant modifiedAt;

    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getModifiedBy() { return modifiedBy; }
    public Instant getModifiedAt() { return modifiedAt; }
}
```

- [ ] **Step 6: Create `JpaAuditConfig.java`**

```java
package com.medhistory.config;

import com.medhistory.auth.AuditorAwareImpl;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditConfig {
}
```

- [ ] **Step 7: Compile to verify**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 8: Commit**

```bash
git add src/main/java/com/medhistory/common/ src/main/java/com/medhistory/auth/AuditorAwareImpl.java \
  src/main/java/com/medhistory/auth/CustomRevisionEntity.java \
  src/main/java/com/medhistory/auth/CustomRevisionListener.java \
  src/main/java/com/medhistory/auth/SecurityUtils.java \
  src/main/java/com/medhistory/config/JpaAuditConfig.java
git commit -m "feat: add base audit entity and Hibernate Envers configuration"
```

---

## Task 6: Correlation ID Filter

**Files:**
- Create: `src/main/java/com/medhistory/common/CorrelationIdFilter.java`

- [ ] **Step 1: Create `CorrelationIdFilter.java`**

```java
package com.medhistory.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1)
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    private static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/medhistory/common/CorrelationIdFilter.java
git commit -m "feat: add correlation ID filter for request tracing"
```

---

## Task 7: JWT Service (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/auth/JwtService.java`
- Create: `src/test/java/com/medhistory/auth/JwtServiceTest.java`

- [ ] **Step 1: Write the failing tests first**

Create `src/test/java/com/medhistory/auth/JwtServiceTest.java`:

```java
package com.medhistory.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;
    private static final String SECRET = "test-secret-that-is-at-least-32-characters-long-for-hs256-algorithm";
    private static final long EXPIRATION_MS = 86400000L;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void generateToken_returnsNonBlankString() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        assertThat(token).isNotBlank();
    }

    @Test
    void extractUserId_returnsOriginalUserId() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        UUID extracted = jwtService.extractUserId(token);
        assertThat(extracted).isEqualTo(userId);
    }

    @Test
    void isValid_returnsTrueForFreshToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void isValid_returnsFalseForTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId) + "tampered";
        assertThat(jwtService.isValid(token)).isFalse();
    }

    @Test
    void isValid_returnsFalseForExpiredToken() {
        JwtService shortLived = new JwtService(SECRET, -1L); // already expired
        UUID userId = UUID.randomUUID();
        String token = shortLived.generateToken(userId);
        assertThat(shortLived.isValid(token)).isFalse();
    }
}
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
mvn test -Dtest=JwtServiceTest -q 2>&1 | tail -5
```

Expected: `COMPILATION ERROR` or `JwtService cannot be resolved` — test fails as expected.

- [ ] **Step 3: Implement `JwtService.java`**

```java
package com.medhistory.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UUID userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey)
                .compact();
    }

    public UUID extractUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }

    public boolean isValid(String token) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
mvn test -Dtest=JwtServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 5, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/medhistory/auth/JwtService.java \
  src/test/java/com/medhistory/auth/JwtServiceTest.java
git commit -m "feat: add JWT service with generate/validate (TDD)"
```

---

## Task 8: JWT Filter

**Files:**
- Create: `src/main/java/com/medhistory/auth/JwtFilter.java`

- [ ] **Step 1: Create `JwtFilter.java`**

```java
package com.medhistory.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "medhistory-token";
    private final JwtService jwtService;

    public JwtFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        extractToken(request)
                .filter(jwtService::isValid)
                .ifPresent(token -> {
                    UUID userId = jwtService.extractUserId(token);
                    MDC.put("userId", userId.toString());
                    var auth = new UsernamePasswordAuthenticationToken(
                            userId.toString(),
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
        chain.doFilter(request, response);
        MDC.remove("userId");
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(c -> COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/medhistory/auth/JwtFilter.java
git commit -m "feat: add JWT cookie filter"
```

---

## Task 9: User Entity, Repository, Service (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/user/User.java`
- Create: `src/main/java/com/medhistory/user/UserRepository.java`
- Create: `src/main/java/com/medhistory/user/UserService.java`
- Create: `src/main/java/com/medhistory/user/UserResponse.java`
- Create: `src/test/java/com/medhistory/user/UserServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/user/UserServiceTest.java`:

```java
package com.medhistory.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void upsertFromOAuth2_createsNewUserWhenNotFound() {
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User result = userService.upsertFromOAuth2("google-123", "test@example.com", "Test User", "https://pic.url");

        assertThat(result.getGoogleId()).isEqualTo("google-123");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void upsertFromOAuth2_updatesExistingUser() {
        User existing = new User();
        existing.setId(UUID.randomUUID());
        existing.setGoogleId("google-123");
        existing.setEmail("old@example.com");
        existing.setName("Old Name");

        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.upsertFromOAuth2("google-123", "new@example.com", "New Name", null);

        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getName()).isEqualTo("New Name");
        verify(userRepository).save(existing);
    }

    @Test
    void getById_returnsUserWhenFound() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User result = userService.getById(id);

        assertThat(result.getId()).isEqualTo(id);
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=UserServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure (User, UserService, UserRepository not yet created).

- [ ] **Step 3: Create `User.java`**

```java
package com.medhistory.user;

import com.medhistory.common.BaseAuditEntity;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "users")
@Audited
public class User extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "google_id", unique = true, nullable = false)
    private String googleId;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(name = "profile_picture")
    private String profilePicture;

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getProfilePicture() { return profilePicture; }
    public void setProfilePicture(String profilePicture) { this.profilePicture = profilePicture; }
}
```

- [ ] **Step 4: Create `UserRepository.java`**

```java
package com.medhistory.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByEmail(String email);
}
```

- [ ] **Step 5: Create `UserService.java`**

```java
package com.medhistory.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User upsertFromOAuth2(String googleId, String email, String name, String profilePicture) {
        User user = userRepository.findByGoogleId(googleId).orElse(new User());
        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setProfilePicture(profilePicture);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }
}
```

- [ ] **Step 6: Create `UserResponse.java`**

```java
package com.medhistory.user;

import java.util.UUID;

public record UserResponse(UUID id, String email, String name, String profilePicture) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getProfilePicture());
    }
}
```

- [ ] **Step 7: Run the tests to confirm they pass**

```bash
mvn test -Dtest=UserServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 8: Commit**

```bash
git add src/main/java/com/medhistory/user/ src/test/java/com/medhistory/user/UserServiceTest.java
git commit -m "feat: add User entity, repository, and service (TDD)"
```

---

## Task 10: Google OAuth2 Success Handler + User Controller

**Files:**
- Create: `src/main/java/com/medhistory/auth/OAuth2SuccessHandler.java`
- Create: `src/main/java/com/medhistory/user/UserController.java`
- Create: `src/test/java/com/medhistory/user/UserControllerTest.java`

- [ ] **Step 1: Write failing controller test**

Create `src/test/java/com/medhistory/user/UserControllerTest.java`:

```java
package com.medhistory.user;

import com.medhistory.auth.JwtFilter;
import com.medhistory.auth.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean UserService userService;
    @MockBean JwtService jwtService;
    @MockBean JwtFilter jwtFilter;

    @Test
    @WithMockUser(username = "00000000-0000-0000-0000-000000000001")
    void getMe_returnsCurrentUser() throws Exception {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setName("Test User");

        when(userService.getById(userId)).thenReturn(user);

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"));
    }

    @Test
    void getMe_returns401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=UserControllerTest -q 2>&1 | tail -5
```

Expected: compilation failure (UserController not yet created).

- [ ] **Step 3: Create `OAuth2SuccessHandler.java`**

```java
package com.medhistory.auth;

import com.medhistory.user.User;
import com.medhistory.user.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;
    private final JwtService jwtService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(UserService userService,
                                JwtService jwtService,
                                @Value("${app.frontend.url}") String frontendUrl) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        User user = userService.upsertFromOAuth2(
                oidcUser.getSubject(),
                oidcUser.getEmail(),
                oidcUser.getFullName(),
                oidcUser.getPicture()
        );

        String token = jwtService.generateToken(user.getId());

        Cookie cookie = new Cookie("medhistory-token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(86400); // 24 hours
        // cookie.setSecure(true); — enabled in prod via profile
        response.addCookie(cookie);

        response.sendRedirect(frontendUrl + "/");
    }
}
```

- [ ] **Step 4: Create `UserController.java`**

```java
package com.medhistory.user;

import com.medhistory.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return SecurityUtils.getCurrentUserId()
                .map(userService::getById)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
mvn test -Dtest=UserControllerTest -q 2>&1 | tail -5
```

Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/medhistory/auth/OAuth2SuccessHandler.java \
  src/main/java/com/medhistory/user/UserController.java \
  src/test/java/com/medhistory/user/UserControllerTest.java
git commit -m "feat: add OAuth2 success handler and /api/users/me endpoint (TDD)"
```

---

## Task 11: Spring Security + Web Config

**Files:**
- Create: `src/main/java/com/medhistory/config/SecurityConfig.java`
- Create: `src/main/java/com/medhistory/config/WebConfig.java`

- [ ] **Step 1: Create `SecurityConfig.java`**

```java
package com.medhistory.config;

import com.medhistory.auth.JwtFilter;
import com.medhistory.auth.OAuth2SuccessHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    public SecurityConfig(JwtFilter jwtFilter, OAuth2SuccessHandler oAuth2SuccessHandler) {
        this.jwtFilter = jwtFilter;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/info",
                    "/actuator/prometheus",
                    "/oauth2/**",
                    "/login/**",
                    "/error"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/", "/index.html", "/*.js", "/*.css", "/*.ico", "/assets/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth -> oauth
                .successHandler(oAuth2SuccessHandler)
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

- [ ] **Step 2: Create `WebConfig.java`**

```java
package com.medhistory.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Static resources are served by Spring Boot's default handler.
        // The SPA fallback (non-API → index.html) is handled by a controller below.
    }
}
```

- [ ] **Step 3: Create SPA fallback controller**

Add this class alongside WebConfig:

Create `src/main/java/com/medhistory/config/SpaFallbackController.java`:

```java
package com.medhistory.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaFallbackController {

    // Forward all non-API, non-static routes to index.html so React Router handles them
    @GetMapping(value = {
        "/visits/**",
        "/search",
        "/profile"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
```

- [ ] **Step 4: Build and start the application to verify it boots**

Make sure Docker Compose is running, then:

```bash
export SPRING_PROFILES_ACTIVE=local
export GOOGLE_CLIENT_ID=placeholder
export GOOGLE_CLIENT_SECRET=placeholder
export JWT_SECRET=test-secret-that-is-at-least-32-characters-long-for-hs256
export VAPID_PUBLIC_KEY=placeholder
export VAPID_PRIVATE_KEY=placeholder
mvn spring-boot:run -Dspring-boot.run.profiles=local 2>&1 | grep -E "Started|ERROR" | head -5
```

Expected: `Started MedhistoryApplication in X seconds`

- [ ] **Step 5: Verify actuator health endpoint**

```bash
curl -s http://localhost:8080/actuator/health | python3 -m json.tool
```

Expected: `{"status": "UP", ...}`

- [ ] **Step 6: Stop the app (Ctrl+C) and commit**

```bash
git add src/main/java/com/medhistory/config/
git commit -m "feat: add Spring Security config, CORS, and SPA fallback"
```

---

## Task 12: R2/MinIO Configuration + Actuator Tuning

**Files:**
- Create: `src/main/java/com/medhistory/config/R2Config.java`

- [ ] **Step 1: Create `R2Config.java`**

```java
package com.medhistory.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class R2Config {

    @Value("${app.storage.endpoint}")
    private String endpoint;

    @Value("${app.storage.access-key}")
    private String accessKey;

    @Value("${app.storage.secret-key}")
    private String secretKey;

    @Value("${app.storage.path-style-access:false}")
    private boolean pathStyleAccess;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.US_EAST_1)        // required by SDK even for non-AWS
                .forcePathStyle(pathStyleAccess)
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.US_EAST_1)
                .build();
    }
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Run all tests to confirm everything still passes**

```bash
mvn test -q 2>&1 | tail -8
```

Expected: all tests pass, no failures.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/medhistory/config/R2Config.java \
  src/main/java/com/medhistory/config/SpaFallbackController.java
git commit -m "feat: add R2/MinIO S3 client configuration"
```

---

## Task 13: Smoke Test — Full Boot with Real Database

This task verifies the entire foundation works end-to-end before moving to Plan 2.

- [ ] **Step 1: Ensure Docker Compose is running**

```bash
docker compose ps
```

Expected: `medhistory-postgres` and `medhistory-minio` both show `healthy`.

- [ ] **Step 2: Boot the application with local profile**

```bash
export SPRING_PROFILES_ACTIVE=local
source .env.local   # or export vars manually
mvn spring-boot:run -Dspring-boot.run.profiles=local 2>&1 | grep -E "Started|Flyway|ERROR" | head -10
```

Expected output includes:
```
Flyway: Successfully applied 4 migrations
Started MedhistoryApplication in X seconds
```

- [ ] **Step 3: Check health**

```bash
curl -s http://localhost:8080/actuator/health | python3 -m json.tool
```

Expected: `"status": "UP"` with `db` component showing `UP`.

- [ ] **Step 4: Check Prometheus metrics are exposed**

```bash
curl -s http://localhost:8080/actuator/prometheus | grep jvm_memory | head -3
```

Expected: several `jvm_memory_*` metric lines.

- [ ] **Step 5: Check that OAuth2 redirect is reachable**

```bash
curl -v http://localhost:8080/oauth2/authorization/google 2>&1 | grep "< HTTP\|Location:"
```

Expected: `HTTP/1.1 302 Found` with `Location: https://accounts.google.com/o/oauth2/...`

- [ ] **Step 6: Stop the app and run the full test suite**

```bash
mvn test -q 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 7: Commit smoke test results (update this plan file)**

```bash
git add docs/superpowers/plans/2026-04-12-plan-1-foundation.md
git commit -m "chore: mark Plan 1 foundation smoke test complete"
```

---

## Done ✓

Plan 1 is complete when:
- Docker Compose starts Postgres + MinIO cleanly
- All 4 Flyway migrations apply successfully (domain tables + audit tables + search vector)
- The Spring Boot app boots on `local` profile without errors
- `/actuator/health` returns `UP` with DB connectivity confirmed
- `/actuator/prometheus` exposes JVM + HTTP metrics
- `/oauth2/authorization/google` redirects to Google
- All unit tests pass (`mvn test`)

**Next:** Implement [Plan 2 — Backend Features](2026-04-12-plan-2-backend-features.md)
