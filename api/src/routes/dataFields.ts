import { Router } from 'express';
import { AppDataSource } from '../database/datasource';
import { DataField } from '../entities/DataField';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import slugify from 'slugify';
import { ILike } from 'typeorm';

const router = Router();

const dataFieldSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  dataType: z.string().nullable().optional(),
  sourceSystem: z.string().nullable().optional(),
});

const repo = () => AppDataSource.getRepository(DataField);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const fields = await repo().find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { name: 'ASC' },
    });
    res.json({ data: fields });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const field = await repo().findOne({
      where: { id: req.params.id },
      relations: { reports: { report: true } },
    });
    if (!field) { res.status(404).json({ error: 'Data field not found' }); return; }
    res.json({ data: field });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = dataFieldSchema.parse(req.body);
    const field = repo().create({ ...body, slug: slugify(body.name, { lower: true, strict: true }) });
    await repo().save(field);
    res.status(201).json({ data: field });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = dataFieldSchema.partial().parse(req.body);
    const field = await repo().findOneByOrFail({ id: req.params.id });
    Object.assign(field, {
      ...body,
      ...(body.name && { slug: slugify(body.name, { lower: true, strict: true }) }),
    });
    await repo().save(field);
    res.json({ data: field });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await repo().delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as dataFieldsRouter };
