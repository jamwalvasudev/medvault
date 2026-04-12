-- Widen specialties.id from SMALLINT (int2) to INTEGER (int4)
-- to match Hibernate's expectation for a Java Integer field.
ALTER TABLE specialties ALTER COLUMN id TYPE INTEGER;
