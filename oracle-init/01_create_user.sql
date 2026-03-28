-- Run against the pluggable database (FREEPDB1)
-- This script creates the catalog application user and grants the necessary privileges.
-- Executed automatically on first container start via /docker-entrypoint-initdb.d/

ALTER SESSION SET CONTAINER = FREEPDB1;

CREATE USER catalog_user IDENTIFIED BY catalog_password
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION TO catalog_user;
GRANT CREATE TABLE TO catalog_user;
GRANT CREATE SEQUENCE TO catalog_user;
GRANT CREATE INDEX TO catalog_user;
GRANT CREATE VIEW TO catalog_user;
GRANT CREATE TRIGGER TO catalog_user;

COMMIT;
