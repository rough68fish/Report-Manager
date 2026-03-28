import {
  Entity, PrimaryColumn, Column, OneToMany, BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ReportDataField } from './ReportDataField';

@Entity('CATALOG_DATA_FIELDS')
export class DataField {
  @PrimaryColumn({ name: 'ID', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'NAME', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'SLUG', type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'DESCRIPTION', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'DATA_TYPE', type: 'varchar', length: 50, nullable: true })
  dataType: string | null;

  @Column({ name: 'SOURCE_SYSTEM', type: 'varchar', length: 255, nullable: true })
  sourceSystem: string | null;

  @OneToMany(() => ReportDataField, (rdf) => rdf.dataField)
  reports: ReportDataField[];

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
