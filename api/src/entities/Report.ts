import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ReportDataField } from './ReportDataField';
import { ReportCategory } from './ReportCategory';
import { ReportTag } from './ReportTag';

export type ReportType = 'bi_dashboard' | 'pdf_report' | 'web_report' | 'sql_extract';
export type ReportStatus = 'draft' | 'published' | 'archived';

@Entity('CATALOG_REPORTS')
export class Report {
  @PrimaryColumn({ name: 'ID', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'TITLE', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'SLUG', type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'DESCRIPTION', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'TYPE', type: 'varchar', length: 50 })
  type: ReportType;

  @Column({ name: 'URL', type: 'varchar', length: 1000, nullable: true })
  url: string | null;

  @Column({ name: 'OWNER_NAME', type: 'varchar', length: 255, nullable: true })
  ownerName: string | null;

  @Column({ name: 'OWNER_EMAIL', type: 'varchar', length: 255, nullable: true })
  ownerEmail: string | null;

  @Column({ name: 'DEPARTMENT', type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ name: 'REFRESH_CADENCE', type: 'varchar', length: 100, nullable: true })
  refreshCadence: string | null;

  @Column({ name: 'DATA_START_DATE', type: 'date', nullable: true })
  dataStartDate: Date | null;

  @Column({ name: 'DATA_END_DATE', type: 'date', nullable: true })
  dataEndDate: Date | null;

  @Column({ name: 'STATUS', type: 'varchar', length: 20, default: 'draft' })
  status: ReportStatus;

  @Column({ name: 'DRUPAL_NODE_ID', type: 'int', nullable: true })
  drupalNodeId: number | null;

  @Column({ name: 'ELASTIC_DOC_ID', type: 'varchar', length: 255, nullable: true })
  elasticDocId: string | null;

  @Column({ name: 'CREATED_BY', type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'CREATED_AT' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT' })
  updatedAt: Date;

  @OneToMany(() => ReportDataField, (rdf) => rdf.report, { cascade: true })
  dataFields: ReportDataField[];

  @OneToMany(() => ReportCategory, (rc) => rc.report, { cascade: true })
  categories: ReportCategory[];

  @OneToMany(() => ReportTag, (rt) => rt.report, { cascade: true })
  tags: ReportTag[];

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
