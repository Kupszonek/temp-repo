-- init.sql
CREATE DATABASE IF NOT EXISTS product;
CREATE USER IF NOT EXISTS 'tda_user'@'%' IDENTIFIED BY 'strongPassword?';
CREATE USER IF NOT EXISTS 'tda_user'@'127.0.0.1' IDENTIFIED BY 'strongPassword?';
GRANT ALL PRIVILEGES ON product.* TO 'tda_user'@'%';
GRANT ALL PRIVILEGES ON product.* TO 'tda_user'@'127.0.0.1';
FLUSH PRIVILEGES;