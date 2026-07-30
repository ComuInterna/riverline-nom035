INSERT INTO seguimiento.admins (user_id, nombre)
VALUES ('11111111-1111-1111-1111-111111111111', 'Admin de prueba')
ON CONFLICT DO NOTHING;
