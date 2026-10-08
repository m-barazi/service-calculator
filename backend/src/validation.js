import { z } from 'zod';

const MAX_SHORT_TEXT = 255;
const MAX_LONG_TEXT = 2000;

const idSchema = z.string().uuid().optional().nullable();

const shortText = z.string().max(MAX_SHORT_TEXT).nullish();
const longText = z.string().max(MAX_LONG_TEXT).nullish();

export const priceValue = z.union([
  z.number().finite(),
  z.string().transform((val, ctx) => {
    const n = Number(val);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid number' });
      return z.NEVER;
    }
    return n;
  }),
]).transform((n) => Math.round(n * 100) / 100);

export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT),
  categoryId: idSchema,
  purchasePrice: priceValue.default(0),
  salePrice: priceValue.default(0),
  defaultQuantity: z.union([z.number().int().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().nonnegative())
    .default(1),
  url: shortText,
  note: longText,
  visible: z.boolean().default(true),
  pinned: z.boolean().default(false),
});

export const serviceUpdateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
  categoryId: idSchema,
  purchasePrice: priceValue.optional(),
  salePrice: priceValue.optional(),
  defaultQuantity: z.union([z.number().int().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().nonnegative())
    .optional(),
  url: shortText,
  note: longText,
  visible: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT),
  description: shortText,
  icon: shortText,
  color: shortText,
  sortOrder: z.union([z.number().int(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int())
    .default(0),
  visible: z.boolean().default(true),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
  description: shortText,
  icon: shortText,
  color: shortText,
  sortOrder: z.union([z.number().int(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int())
    .optional(),
  visible: z.boolean().optional(),
});

export const categoryReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT),
  email: shortText,
  phone: shortText,
  street: shortText,
  zip: shortText,
  city: shortText,
  country: shortText,
  notes: longText,
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
  email: shortText,
  phone: shortText,
  street: shortText,
  zip: shortText,
  city: shortText,
  country: shortText,
  notes: longText,
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT),
  customerId: idSchema,
  description: shortText,
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
  customerId: idSchema,
  description: shortText,
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
});

const quoteStatusEnum = z.enum(['draft', 'sent', 'accepted', 'rejected']);

export const quoteCreateSchema = z.object({
  title: z.string().min(1).max(MAX_SHORT_TEXT),
  customerId: idSchema,
  customerName: shortText,
  projectId: idSchema,
  status: quoteStatusEnum.default('draft'),
  discountType: z.enum(['percent', 'amount']).nullish(),
  discountValue: z.union([z.number().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative())
    .default(0),
  notes: longText,
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

const quoteItemSchema = z.object({
  serviceId: idSchema,
  customName: shortText,
  customNote: longText,
  quantity: z.union([z.number().positive(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().positive())
    .default(1),
  unitPrice: priceValue.optional(),
  purchasePrice: priceValue.nullish(),
  sortOrder: z.union([z.number().int().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().nonnegative())
    .optional(),
});

export const quoteWithItemsSchema = z.object({
  title: z.string().min(1).max(MAX_SHORT_TEXT),
  customerId: idSchema,
  customerName: shortText,
  projectId: idSchema,
  status: quoteStatusEnum.default('draft'),
  discountType: z.enum(['percent', 'amount']).nullish(),
  discountValue: z.union([z.number().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative())
    .default(0),
  notes: longText,
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  items: z.array(quoteItemSchema).default([]),
});

export const quoteUpdateSchema = z.object({
  title: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
  customerId: idSchema,
  customerName: shortText,
  projectId: idSchema,
  status: quoteStatusEnum.optional(),
  discountType: z.enum(['percent', 'amount']).nullish(),
  discountValue: z.union([z.number().nonnegative(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative())
    .optional(),
  notes: longText,
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export const quoteStatusSchema = z.object({
  status: quoteStatusEnum,
  changedBy: shortText,
});

export const quoteItemCreateSchema = quoteItemSchema;
export const quoteItemUpdateSchema = quoteItemSchema.partial();

export const invoiceUpdateSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  paidAt: z.string().datetime().nullish(),
  notes: longText,
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      const error = new Error('Invalid request body');
      error.name = 'ValidationError';
      error.status = 400;
      error.details = issues;
      return next(error);
    }
    next();
  };
}
