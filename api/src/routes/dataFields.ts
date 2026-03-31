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

/**
 * @swagger
 * /api/data-fields:
 *   get:
 *     tags: [Data Fields]
 *     summary: List data fields
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of data fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DataField'
 */
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

/**
 * @swagger
 * /api/data-fields/{id}:
 *   get:
 *     tags: [Data Fields]
 *     summary: Get a data field by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DataField'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/data-fields:
 *   post:
 *     tags: [Data Fields]
 *     summary: Create a data field
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataFieldInput'
 *     responses:
 *       201:
 *         description: Created data field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DataField'
 */
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

/**
 * @swagger
 * /api/data-fields/{id}:
 *   patch:
 *     tags: [Data Fields]
 *     summary: Update a data field
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
 *             $ref: '#/components/schemas/DataFieldInput'
 *     responses:
 *       200:
 *         description: Updated data field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DataField'
 */
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

/**
 * @swagger
 * /api/data-fields/{id}:
 *   delete:
 *     tags: [Data Fields]
 *     summary: Delete a data field
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

export { router as dataFieldsRouter };
