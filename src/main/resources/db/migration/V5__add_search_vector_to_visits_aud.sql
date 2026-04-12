-- visits_aud must mirror all columns of visits, including search_vector added in V4.
-- The Visit entity maps search_vector with @NotAudited, so Envers will not write to
-- this column, but its presence keeps the schema consistent with the parent table.
ALTER TABLE visits_aud ADD COLUMN search_vector tsvector;
