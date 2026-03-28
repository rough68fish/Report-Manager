import { Router } from 'express';
import { AppDataSource } from '../database/datasource';
import { Category } from '../entities/Category';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import slugify from 'slugify';
import { IsNull } from 'typeorm';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['department', 'topic', 'data_domain', 'audience']).nullable().optional(),
  parentId: z.string().nullable().optional(),
});

const repo = () => AppDataSource.getRepository(Category);

// Returns the full tree: top-level categories with nested children
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const roots = await repo().find({
      where: { parentId: IsNull() },
      relations: { children: true },
      order: { name: 'ASC' },
    });
    res.json({ data: roots });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const cat = await repo().findOne({
      where: { id: req.params.id },
      relations: { parent: true, children: true },
    });
    if (!cat) { res.status(404).json({ error: 'Category not found' }); return; }
    res.json({ data: cat });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = categorySchema.parse(req.body);
    const cat = repo().create({ ...body, slug: slugify(body.name, { lower: true, strict: true }) });
    await repo().save(cat);
    res.status(201).json({ data: cat });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = categorySchema.partial().parse(req.body);
    const cat = await repo().findOneByOrFail({ id: req.params.id });
    Object.assign(cat, {
      ...body,
      ...(body.name && { slug: slugify(body.name, { lower: true, strict: true }) }),
    });
    await repo().save(cat);
    res.json({ data: cat });
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

export { router as categoriesRouter };
