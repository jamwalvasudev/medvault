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
