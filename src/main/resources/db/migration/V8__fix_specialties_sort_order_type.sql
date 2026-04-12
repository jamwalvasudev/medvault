-- Widen specialties.sort_order from SMALLINT (int2) to INTEGER (int4)
-- to match Hibernate's expectation for a Java Integer field.
ALTER TABLE specialties ALTER COLUMN sort_order TYPE INTEGER;
