-- Usuários de teste do grupo (lado AACD). Importar DEPOIS do dump.sql.
-- Hash no formato do back (aacd.util.Senha: PBKDF2-SHA256, 210000 iterações).
--
--   Perfil       Login          E-mail                 Senha
--   ADMIN        admin.teste    admin.teste@aacd.com   Teste@2026
--   FUNCIONARIO  func.teste     func.teste@aacd.com    Teste@2026
--
-- Login da empresa parceira: criar pela tela de cadastro (POST /api/empresas), que é pública.
-- Rodar de novo é seguro: apaga e recria só esses dois usuários.

USE imprimindo_inclusao;

DELETE f FROM funcionario f JOIN usuario u ON u.idusuario = f.usuario_id
  WHERE u.identificador IN ('admin.teste', 'func.teste');
DELETE FROM usuario WHERE identificador IN ('admin.teste', 'func.teste');

INSERT INTO usuario (nome, identificador, senha_hash, perfil, ativo) VALUES
  ('Ana Martins (teste)', 'admin.teste', '210000:UKflGNZkZRdBNG/BndwVIg==:OlvMjPijJ6/A318GusyBsHW8KaNpXilNj41o9XgReP0=', 'ADMIN', 1),
  ('Diego Ramos (teste)', 'func.teste',  '210000:126TK8uunO1KDWSJJuE0Kg==:gOqarFuY453qRo6xY7D6Cv5ksYCzN/i7FIzMGI5Km40=',  'FUNCIONARIO', 1);

INSERT INTO funcionario (usuario_id, email, cargo, setor)
  SELECT idusuario, 'admin.teste@aacd.com', 'Coordenação', 'Administração' FROM usuario WHERE identificador = 'admin.teste';
INSERT INTO funcionario (usuario_id, email, cargo, setor)
  SELECT idusuario, 'func.teste@aacd.com', 'Fisioterapeuta', 'Ortopedia' FROM usuario WHERE identificador = 'func.teste';

SELECT u.idusuario, u.nome, u.identificador, u.perfil, f.email FROM usuario u JOIN funcionario f ON f.usuario_id = u.idusuario
  WHERE u.identificador IN ('admin.teste', 'func.teste');
