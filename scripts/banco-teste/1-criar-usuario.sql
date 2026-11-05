-- Rodar UMA vez como root (MySQL Workbench ou: mysql -u root -p < este arquivo).
-- Cria o usuário que o back usa em src/main/resources/db.properties.
CREATE USER IF NOT EXISTS 'aacd'@'localhost' IDENTIFIED BY 'aacd-teste-2026';
GRANT ALL PRIVILEGES ON imprimindo_inclusao.* TO 'aacd'@'localhost';
FLUSH PRIVILEGES;
