import {
  Entity, PrimaryColumn, Column, ManyToOne, OneToMany,
  JoinColumn, BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ReportCategory } from './ReportCategory';

export type CategoryType = 'department' | 'topic' | 'data_domain' | 'audience';

@Entity('CATALOG_CATEGORIES')
export class Category {
  @PrimaryColumn({ name: 'ID', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'NAME', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'SLUG', type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'TYPE', type: 'varchar', length: 50, nullable: true })
  type: CategoryType | null;

  @Column({ name: 'PARENT_ID', type: 'varchar', length: 36, nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'PARENT_ID' })
  parent: Category | null;

  @OneToMany(() => Category, (cat) => cat.parent)
  children: Category[];

  @OneToMany(() => ReportCategory, (rc) => rc.category)
  reports: ReportCategory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
