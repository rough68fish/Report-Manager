import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './Report';
import { Category } from './Category';

@Entity('CATALOG_REPORT_CATEGORIES')
export class ReportCategory {
  @PrimaryColumn({ name: 'REPORT_ID', type: 'varchar', length: 36 })
  reportId: string;

  @PrimaryColumn({ name: 'CATEGORY_ID', type: 'varchar', length: 36 })
  categoryId: string;

  @ManyToOne(() => Report, (r) => r.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'REPORT_ID' })
  report: Report;

  @ManyToOne(() => Category, (c) => c.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'CATEGORY_ID' })
  category: Category;
}
