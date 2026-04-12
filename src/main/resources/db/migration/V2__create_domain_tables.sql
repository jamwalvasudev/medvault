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
