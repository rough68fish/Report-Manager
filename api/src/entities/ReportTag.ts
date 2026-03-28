import {
  Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Report } from './Report';

// Oracle has no native array type, so tags are stored as rows in this table.
@Entity('CATALOG_REPORT_TAGS')
export class ReportTag {
  @PrimaryColumn({ name: 'ID', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'REPORT_ID', type: 'varchar', length: 36 })
  reportId: string;

  @Column({ name: 'TAG', type: 'varchar', length: 100 })
  tag: string;

  @ManyToOne(() => Report, (r) => r.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'REPORT_ID' })
  report: Report;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
