-- Categorias do piloto em Cáceres/MT
INSERT INTO "categories" ("slug", "name") VALUES
  ('diarista', 'Diarista'),
  ('eletricista', 'Eletricista'),
  ('montador', 'Montador de móveis'),
  ('capinador', 'Capinador')
ON CONFLICT ("slug") DO NOTHING;
