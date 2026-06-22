CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_routes_payload_id_trgm
  ON routes USING GIN (LOWER(payload->>'id') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_routes_payload_filename_trgm
  ON routes USING GIN (LOWER(COALESCE(payload->'source'->>'filename', '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_routes_payload_shape_trgm
  ON routes USING GIN (LOWER(COALESCE(payload->>'shapeType', '')) gin_trgm_ops);

