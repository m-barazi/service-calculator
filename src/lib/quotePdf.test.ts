import { describe, it, expect } from 'vitest'
import { formatCustomerAddress } from './quotePdf'
import type { Customer } from '../types'

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    name: 'Musterfirma GmbH',
    email: 'info@musterfirma.de',
    phone: '+49 123 456789',
    street: 'Musterstraße 12',
    zip: '12345',
    city: 'Musterstadt',
    country: 'Deutschland',
    notes: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatCustomerAddress', () => {
  it('returns an empty string when no customer is given', () => {
    expect(formatCustomerAddress(undefined)).toBe('')
  })

  it('formats a complete address', () => {
    const customer = makeCustomer()
    expect(formatCustomerAddress(customer)).toBe(
      'Musterstraße 12\n12345 Musterstadt\nDeutschland',
    )
  })

  it('omits missing fields', () => {
    const customer = makeCustomer({ street: undefined, country: undefined })
    expect(formatCustomerAddress(customer)).toBe('12345 Musterstadt')
  })

  it('returns only the city when zip is missing', () => {
    const customer = makeCustomer({ zip: undefined })
    expect(formatCustomerAddress(customer)).toBe(
      'Musterstraße 12\nMusterstadt\nDeutschland',
    )
  })
})
