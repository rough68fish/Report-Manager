import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './Report';
import { DataField } from './DataField';

@Entity('CATALOG_REPORT_DATA_FIELDS')
export class ReportDataField {
  @PrimaryColumn({ name: 'REPORT_ID', type: 'varchar', length: 36 })
  reportId: string;

  @PrimaryColumn({ name: 'DATA_FIELD_ID', type: 'varchar', length: 36 })
  dataFieldId: string;

  @ManyToOne(() => Report, (r) => r.dataFields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'REPORT_ID' })
  report: Report;

  @ManyToOne(() => DataField, (df) => df.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'DATA_FIELD_ID' })
  dataField: DataField;
}
