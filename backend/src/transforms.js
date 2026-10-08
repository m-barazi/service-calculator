// Row-to-frontend (camelCase) transformers.

export function toCamel(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    purchasePrice: parseFloat(row.purchase_price),
    salePrice: parseFloat(row.sale_price),
    defaultQuantity: row.default_quantity,
    url: row.url,
    note: row.note,
    visible: row.visible,
    pinned: row.pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCamelCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    visible: row.visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCamelCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    street: row.street,
    zip: row.zip,
    city: row.city,
    country: row.country,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCamelProject(row) {
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCamelQuote(row) {
  const quote = {
    id: row.id,
    quoteNumber: row.quote_number,
    title: row.title,
    customerId: row.customer_id,
    customerName: row.customer_name,
    projectId: row.project_id,
    projectName: row.project_name,
    status: row.status,
    discountType: row.discount_type,
    discountValue: parseFloat(row.discount_value ?? 0),
    notes: row.notes,
    validUntil: row.valid_until ? (row.valid_until.toISOString ? row.valid_until.toISOString().slice(0, 10) : String(row.valid_until).slice(0, 10)) : null,
    totalNet: parseFloat(row.total_net ?? 0),
    totalGross: parseFloat(row.total_gross ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.subtotal_net !== undefined) {
    quote.subtotalNet = parseFloat(row.subtotal_net ?? 0);
  }
  return quote;
}

export function toCamelQuoteItem(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    serviceId: row.service_id,
    customName: row.custom_name,
    customNote: row.custom_note,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price ?? 0),
    purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    service: row.service_name
      ? {
          id: row.service_id,
          name: row.service_name,
          purchasePrice: parseFloat(row.service_purchase_price),
          salePrice: parseFloat(row.service_sale_price),
          categoryId: row.service_category_id,
        }
      : undefined,
  };
}

export function toCamelInvoice(row) {
  const invoice = {
    id: row.id,
    invoiceNumber: row.invoice_number,
    quoteId: row.quote_id,
    quoteNumber: row.quote_number,
    projectId: row.project_id,
    projectName: row.project_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    title: row.title,
    status: row.status,
    dueDate: row.due_date ? (row.due_date.toISOString ? row.due_date.toISOString().slice(0, 10) : String(row.due_date).slice(0, 10)) : null,
    paidAt: row.paid_at,
    notes: row.notes,
    totalNet: parseFloat(row.total_net ?? 0),
    totalGross: parseFloat(row.total_gross ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.quote_id && row.quote_number !== undefined) {
    invoice.quote = {
      id: row.quote_id,
      quoteNumber: row.quote_number,
      title: row.quote_title,
      status: row.quote_status,
      customerId: row.quote_customer_id,
      customerName: row.quote_customer_name,
      projectId: row.quote_project_id,
      projectName: row.quote_project_name,
    };
  }
  if (row.customer_id && row.customer_name !== undefined) {
    invoice.customer = toCamelCustomer(row);
  }
  if (row.project_id && row.project_name !== undefined) {
    invoice.project = {
      id: row.project_id,
      name: row.project_name,
      customerId: row.project_customer_id,
      customerName: row.project_customer_name,
      status: row.project_status,
    };
  }
  return invoice;
}
