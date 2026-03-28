import { Router } from 'express';
import { AppDataSource } from '../database/datasource';
import { Report } from '../entities/Report';
import { ReportDataField } from '../entities/ReportDataField';
import { ReportCategory } from '../entities/ReportCategory';
import { ReportTag } from '../entities/ReportTag';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import slugify from 'slugify';
import { ILike } from 'typeorm';

const router = Router();

const reportSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(['bi_dashboard', 'pdf_report', 'web_report', 'sql_extract']),
  url: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  ownerEmail: z.string().email().nullable().optional(),
  department: z.string().nullable().optional(),
  refreshCadence: z.string().nullable().optional(),
  dataStartDate: z.string().nullable().optional(),
  dataEndDate: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string()).optional(),
  dataFieldIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

const reportRepo = () => AppDataSource.getRepository(Report);

// GET /api/reports
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, type, department, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = Math.min(parseInt(limit as string), 100);

    const where: object[] | object = search
      ? [
          { title: ILike(`%${search}%`) },
          { description: ILike(`%${search}%`) },
          { department: ILike(`%${search}%`) },
        ]
      : {
          ...(status && { status }),
          ...(type && { type }),
          ...(department && { department: ILike(`%${department}%`) }),
        };

    const [reports, total] = await reportRepo().findAndCount({
      where,
      skip,
      take,
      order: { updatedAt: 'DESC' },
      relations: {
        dataFields: { dataField: true },
        categories: { category: true },
        tags: true,
      },
    });

    res.json({ data: reports, meta: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const report = await reportRepo().findOne({
      where: { id: req.params.id },
      relations: { dataFields: { dataField: true }, categories: { category: true }, tags: true },
    });
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

// POST /api/reports
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = reportSchema.parse(req.body);
    const { dataFieldIds = [], categoryIds = [], tags = [], ...fields } = body;

    const report = reportRepo().create({
      ...fields,
      slug: slugify(fields.title, { lower: true, strict: true }),
      createdBy: req.user?.sub,
      dataStartDate: fields.dataStartDate ? new Date(fields.dataStartDate) : null,
      dataEndDate: fields.dataEndDate ? new Date(fields.dataEndDate) : null,
    });

    await AppDataSource.transaction(async (manager) => {
      await manager.save(report);

      if (dataFieldIds.length) {
        const rows = dataFieldIds.map((id) =>
          manager.create(ReportDataField, { reportId: report.id, dataFieldId: id }),
        );
        await manager.save(rows);
      }
      if (categoryIds.length) {
        const rows = categoryIds.map((id) =>
          manager.create(ReportCategory, { reportId: report.id, categoryId: id }),
        );
        await manager.save(rows);
      }
      if (tags.length) {
        const rows = tags.map((tag) =>
          manager.create(ReportTag, { reportId: report.id, tag }),
        );
        await manager.save(rows);
      }
    });

    const created = await reportRepo().findOne({
      where: { id: report.id },
      relations: { dataFields: { dataField: true }, categories: { category: true }, tags: true },
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reports/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = reportSchema.partial().parse(req.body);
    const { dataFieldIds, categoryIds, tags, ...fields } = body;

    const report = await reportRepo().findOneByOrFail({ id: req.params.id });

    Object.assign(report, {
      ...fields,
      ...(fields.title && { slug: slugify(fields.title, { lower: true, strict: true }) }),
      ...(fields.dataStartDate !== undefined && {
        dataStartDate: fields.dataStartDate ? new Date(fields.dataStartDate) : null,
      }),
      ...(fields.dataEndDate !== undefined && {
        dataEndDate: fields.dataEndDate ? new Date(fields.dataEndDate) : null,
      }),
    });

    await AppDataSource.transaction(async (manager) => {
      await manager.save(report);

      if (dataFieldIds !== undefined) {
        await manager.delete(ReportDataField, { reportId: report.id });
        if (dataFieldIds.length) {
          await manager.save(
            dataFieldIds.map((id) =>
              manager.create(ReportDataField, { reportId: report.id, dataFieldId: id }),
            ),
          );
        }
      }
      if (categoryIds !== undefined) {
        await manager.delete(ReportCategory, { reportId: report.id });
        if (categoryIds.length) {
          await manager.save(
            categoryIds.map((id) =>
              manager.create(ReportCategory, { reportId: report.id, categoryId: id }),
            ),
          );
        }
      }
      if (tags !== undefined) {
        await manager.delete(ReportTag, { reportId: report.id });
        if (tags.length) {
          await manager.save(
            tags.map((tag) => manager.create(ReportTag, { reportId: report.id, tag })),
          );
        }
      }
    });

    const updated = await reportRepo().findOne({
      where: { id: report.id },
      relations: { dataFields: { dataField: true }, categories: { category: true }, tags: true },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reports/:id (soft delete — sets status to archived)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await reportRepo().update(req.params.id, { status: 'archived' });
    res.json({ data: { id: req.params.id, status: 'archived' } });
  } catch (err) {
    next(err);
  }
});

export { router as reportsRouter };
