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

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories (full tree)
 *     description: Returns top-level categories with nested children.
 *     responses:
 *       200:
 *         description: Category tree
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
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

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category with parent and children
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Created category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
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

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Updated category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 */
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

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await repo().delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as categoriesRouter };
