import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774701534234 implements MigrationInterface {
    name = 'Migration1774701534234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "CATALOG_DATA_FIELDS" ("ID" character varying(36) NOT NULL, "NAME" character varying(255) NOT NULL, "SLUG" character varying(255) NOT NULL, "DESCRIPTION" text, "DATA_TYPE" character varying(50), "SOURCE_SYSTEM" character varying(255), CONSTRAINT "UQ_3320cc2b434939b5e12a5ec9aee" UNIQUE ("SLUG"), CONSTRAINT "PK_b3e7f00580535c5884c143b5bc0" PRIMARY KEY ("ID"))`);
        await queryRunner.query(`CREATE TABLE "CATALOG_REPORT_DATA_FIELDS" ("REPORT_ID" character varying(36) NOT NULL, "DATA_FIELD_ID" character varying(36) NOT NULL, CONSTRAINT "PK_407b930d7e03e5a05667f427a0d" PRIMARY KEY ("REPORT_ID", "DATA_FIELD_ID"))`);
        await queryRunner.query(`CREATE TABLE "CATALOG_CATEGORIES" ("ID" character varying(36) NOT NULL, "NAME" character varying(255) NOT NULL, "SLUG" character varying(255) NOT NULL, "TYPE" character varying(50), "PARENT_ID" character varying(36), CONSTRAINT "UQ_3690baa9ef08aaac11963ab42a5" UNIQUE ("SLUG"), CONSTRAINT "PK_0d0436f9604b6a4965b8c52d6be" PRIMARY KEY ("ID"))`);
        await queryRunner.query(`CREATE TABLE "CATALOG_REPORT_CATEGORIES" ("REPORT_ID" character varying(36) NOT NULL, "CATEGORY_ID" character varying(36) NOT NULL, CONSTRAINT "PK_3d1573233dfaf9119226220b6dd" PRIMARY KEY ("REPORT_ID", "CATEGORY_ID"))`);
        await queryRunner.query(`CREATE TABLE "CATALOG_REPORT_TAGS" ("ID" character varying(36) NOT NULL, "REPORT_ID" character varying(36) NOT NULL, "TAG" character varying(100) NOT NULL, CONSTRAINT "PK_f9d657523816b99ce397519b9c8" PRIMARY KEY ("ID"))`);
        await queryRunner.query(`CREATE TABLE "CATALOG_REPORTS" ("ID" character varying(36) NOT NULL, "TITLE" character varying(255) NOT NULL, "SLUG" character varying(255) NOT NULL, "DESCRIPTION" text, "TYPE" character varying(50) NOT NULL, "URL" character varying(1000), "OWNER_NAME" character varying(255), "OWNER_EMAIL" character varying(255), "DEPARTMENT" character varying(255), "REFRESH_CADENCE" character varying(100), "DATA_START_DATE" date, "DATA_END_DATE" date, "STATUS" character varying(20) NOT NULL DEFAULT 'draft', "DRUPAL_NODE_ID" integer, "ELASTIC_DOC_ID" character varying(255), "CREATED_BY" character varying(255), "CREATED_AT" TIMESTAMP NOT NULL DEFAULT now(), "UPDATED_AT" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_20d96ce71eedb1e53704389732f" UNIQUE ("SLUG"), CONSTRAINT "PK_e6c094a30320aa2b8b96bd5e155" PRIMARY KEY ("ID"))`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_DATA_FIELDS" ADD CONSTRAINT "FK_a8b0c28eda246c153ba594e06d6" FOREIGN KEY ("REPORT_ID") REFERENCES "CATALOG_REPORTS"("ID") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_DATA_FIELDS" ADD CONSTRAINT "FK_483b837e8b21dd7d65d9e75c66a" FOREIGN KEY ("DATA_FIELD_ID") REFERENCES "CATALOG_DATA_FIELDS"("ID") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CATALOG_CATEGORIES" ADD CONSTRAINT "FK_188b3e119e320796cf7e27b5883" FOREIGN KEY ("PARENT_ID") REFERENCES "CATALOG_CATEGORIES"("ID") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_CATEGORIES" ADD CONSTRAINT "FK_904d16f895ff630c24d16ad3023" FOREIGN KEY ("REPORT_ID") REFERENCES "CATALOG_REPORTS"("ID") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_CATEGORIES" ADD CONSTRAINT "FK_ac92af5297bf1834b21cb3b02bf" FOREIGN KEY ("CATEGORY_ID") REFERENCES "CATALOG_CATEGORIES"("ID") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_TAGS" ADD CONSTRAINT "FK_4d858b6a192cb8f76f0dc0c20d6" FOREIGN KEY ("REPORT_ID") REFERENCES "CATALOG_REPORTS"("ID") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_TAGS" DROP CONSTRAINT "FK_4d858b6a192cb8f76f0dc0c20d6"`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_CATEGORIES" DROP CONSTRAINT "FK_ac92af5297bf1834b21cb3b02bf"`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_CATEGORIES" DROP CONSTRAINT "FK_904d16f895ff630c24d16ad3023"`);
        await queryRunner.query(`ALTER TABLE "CATALOG_CATEGORIES" DROP CONSTRAINT "FK_188b3e119e320796cf7e27b5883"`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_DATA_FIELDS" DROP CONSTRAINT "FK_483b837e8b21dd7d65d9e75c66a"`);
        await queryRunner.query(`ALTER TABLE "CATALOG_REPORT_DATA_FIELDS" DROP CONSTRAINT "FK_a8b0c28eda246c153ba594e06d6"`);
        await queryRunner.query(`DROP TABLE "CATALOG_REPORTS"`);
        await queryRunner.query(`DROP TABLE "CATALOG_REPORT_TAGS"`);
        await queryRunner.query(`DROP TABLE "CATALOG_REPORT_CATEGORIES"`);
        await queryRunner.query(`DROP TABLE "CATALOG_CATEGORIES"`);
        await queryRunner.query(`DROP TABLE "CATALOG_REPORT_DATA_FIELDS"`);
        await queryRunner.query(`DROP TABLE "CATALOG_DATA_FIELDS"`);
    }

}
