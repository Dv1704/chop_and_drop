import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyCustomer, notifyRestaurant } from '@/lib/whatsapp';

const ITEMS = [{ item_name: 'Jollof Rice', qty: 2, unit_price: 3500 }];

function fetchMock() {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', fetchMock());
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.RESTAURANT_WHATSAPP_NUMBER;
});

const customerPayload = {
  phone: '08031234567',
  name: 'Ada',
  orderId: 'abcdef1234567890',
  items: ITEMS,
  total: 7000,
  mode: 'delivery',
};

describe('notifyCustomer', () => {
  it('POSTs to the Graph URL with phone id, bearer token and normalized "to"', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id-99';
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    await notifyCustomer(customerPayload);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v19.0/phone-id-99/messages');
    expect(opts.headers.Authorization).toBe('Bearer wa-token');
    const body = JSON.parse(opts.body);
    expect(body.to).toBe('2348031234567');
  });

  it('does NOT call fetch when the access token is unset', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id-99';
    await expect(notifyCustomer(customerPayload)).resolves.not.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does NOT call fetch when the phone number id is unset', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    await expect(notifyCustomer(customerPayload)).resolves.not.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not throw when fetch resolves { ok: false }', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id-99';
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'x' }) })
    );
    await expect(notifyCustomer(customerPayload)).resolves.not.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('notifyRestaurant', () => {
  const payload = {
    orderId: 'abcdef1234567890',
    customerName: 'Ada',
    customerPhone: '08031234567',
    items: ITEMS,
    total: 7000,
    mode: 'delivery',
  };

  it('does NOT call fetch when RESTAURANT_WHATSAPP_NUMBER is unset', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id-99';
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    await notifyRestaurant(payload);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch to the restaurant number when it and the API vars are set', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id-99';
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    process.env.RESTAURANT_WHATSAPP_NUMBER = '2349001112222';
    await notifyRestaurant(payload);

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.to).toBe('2349001112222');
  });
});
