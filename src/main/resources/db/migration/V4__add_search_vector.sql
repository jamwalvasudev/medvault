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
