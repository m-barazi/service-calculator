import { describe, it, expect } from 'vitest';
import {
  serviceCreateSchema,
  serviceUpdateSchema,
  categoryCreateSchema,
  customerCreateSchema,
  projectCreateSchema,
  quoteCreateSchema,
  quoteWithItemsSchema,
  quoteUpdateSchema,
  quoteStatusSchema,
  quoteItemCreateSchema,
  invoiceUpdateSchema,
} from './validation.js';

describe('serviceCreateSchema', () => {
  it('accepts a valid service', () => {
    const result = serviceCreateSchema.safeParse({
      name: 'Flyer A5',
      categoryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      purchasePrice: 50,
      salePrice: 90,
      defaultQuantity: 100,
      visible: true,
      pinned: false,
    });
    expect(result.success).toBe(true);
    expect(result.data.salePrice).toBe(90);
  });

  it('rejects an empty name', () => {
    const result = serviceCreateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rounds prices to two decimals', () => {
    const result = serviceCreateSchema.safeParse({ name: 'X', salePrice: 90.999 });
    expect(result.success).toBe(true);
    expect(result.data.salePrice).toBe(91);
  });

  it('accepts numeric strings for prices', () => {
    const result = serviceCreateSchema.safeParse({ name: 'X', salePrice: '123.45' });
    expect(result.success).toBe(true);
    expect(result.data.salePrice).toBe(123.45);
  });

  it('rejects non-numeric prices', () => {
    const result = serviceCreateSchema.safeParse({ name: 'X', salePrice: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('serviceUpdateSchema', () => {
  it('accepts partial updates and strips extra fields', () => {
    const result = serviceUpdateSchema.safeParse({ salePrice: 99, extra: true });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ salePrice: 99 });
  });

  it('leaves missing fields undefined', () => {
    const result = serviceUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(Object.keys(result.data)).toHaveLength(0);
  });
});

describe('categoryCreateSchema', () => {
  it('requires a name', () => {
    const result = categoryCreateSchema.safeParse({ sortOrder: 1 });
    expect(result.success).toBe(false);
  });

  it('applies sensible defaults', () => {
    const result = categoryCreateSchema.safeParse({ name: 'Druck' });
    expect(result.success).toBe(true);
    expect(result.data.sortOrder).toBe(0);
    expect(result.data.visible).toBe(true);
  });
});

describe('customerCreateSchema', () => {
  it('requires a name', () => {
    const result = customerCreateSchema.safeParse({ email: 'x@y.z' });
    expect(result.success).toBe(false);
  });

  it('accepts missing optional fields as undefined', () => {
    const result = customerCreateSchema.safeParse({ name: 'Acme' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBeUndefined();
  });
});

describe('projectCreateSchema', () => {
  it('rejects invalid status values', () => {
    const result = projectCreateSchema.safeParse({ name: 'P', status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('defaults status to active', () => {
    const result = projectCreateSchema.safeParse({ name: 'P' });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('active');
  });
});

describe('quoteCreateSchema', () => {
  it('requires a title', () => {
    const result = quoteCreateSchema.safeParse({ discountValue: 10 });
    expect(result.success).toBe(false);
  });

  it('validates status enum', () => {
    const result = quoteCreateSchema.safeParse({ title: 'Q', status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('validates ISO date format', () => {
    const result = quoteCreateSchema.safeParse({ title: 'Q', validUntil: '2024-12-31' });
    expect(result.success).toBe(true);
  });

  it('rejects malformed dates', () => {
    const result = quoteCreateSchema.safeParse({ title: 'Q', validUntil: '31.12.2024' });
    expect(result.success).toBe(false);
  });
});

describe('quoteWithItemsSchema', () => {
  it('accepts a quote with items', () => {
    const result = quoteWithItemsSchema.safeParse({
      title: 'Angebot',
      items: [
        { serviceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 2, unitPrice: 50 },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0].unitPrice).toBe(50);
  });

  it('rejects items with non-positive quantity', () => {
    const result = quoteWithItemsSchema.safeParse({
      title: 'Angebot',
      items: [{ quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('defaults empty items array', () => {
    const result = quoteWithItemsSchema.safeParse({ title: 'Angebot' });
    expect(result.success).toBe(true);
    expect(result.data.items).toEqual([]);
  });
});

describe('quoteStatusSchema', () => {
  it('accepts valid status transition', () => {
    const result = quoteStatusSchema.safeParse({ status: 'sent' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = quoteStatusSchema.safeParse({ status: 'invoiced' });
    expect(result.success).toBe(false);
  });
});

describe('quoteItemCreateSchema', () => {
  it('accepts valid item', () => {
    const result = quoteItemCreateSchema.safeParse({
      serviceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantity: 5,
      unitPrice: 12.5,
    });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(5);
  });
});

describe('invoiceUpdateSchema', () => {
  it('accepts status update', () => {
    const result = invoiceUpdateSchema.safeParse({ status: 'paid' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = invoiceUpdateSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(false);
  });
});
