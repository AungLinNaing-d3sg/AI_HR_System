/**
 * @jest-environment node
 */
describe('backendClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to the local Postman-collection base URL and disables the insecure TLS agent', async () => {
    delete process.env.BACKEND_API_URL;
    delete process.env.BACKEND_ALLOW_INSECURE_TLS;

    const { backendClient } = await import('./backendClient');
    expect(backendClient.defaults.baseURL).toBe('https://localhost:7195/api/v1');
    expect(backendClient.defaults.httpsAgent).toBeUndefined();
  });

  it('uses BACKEND_API_URL when set', async () => {
    process.env.BACKEND_API_URL = 'https://backend.internal/api/v1';

    const { backendClient } = await import('./backendClient');
    expect(backendClient.defaults.baseURL).toBe('https://backend.internal/api/v1');
  });

  it('only enables the insecure TLS agent when explicitly opted in', async () => {
    process.env.BACKEND_ALLOW_INSECURE_TLS = 'true';

    const { backendClient } = await import('./backendClient');
    expect(backendClient.defaults.httpsAgent).toBeDefined();
  });

  it('unwraps the {StatusCode, IsSuccess, Message, Data} envelope on a successful response', async () => {
    const { backendClient } = await import('./backendClient');
    backendClient.defaults.adapter = async (config) => ({
      data: { StatusCode: 200, IsSuccess: true, Message: 'Success', Data: { Foo: 'bar' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    const response = await backendClient.get('/whatever');
    expect(response.data).toEqual({ Foo: 'bar' });
  });

  it('leaves non-enveloped responses untouched', async () => {
    const { backendClient } = await import('./backendClient');
    backendClient.defaults.adapter = async (config) => ({
      data: { Foo: 'bar' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    const response = await backendClient.get('/whatever');
    expect(response.data).toEqual({ Foo: 'bar' });
  });

  it('throws when the envelope reports IsSuccess: false on an HTTP 200 (e.g. a wrong current password)', async () => {
    const { backendClient } = await import('./backendClient');
    backendClient.defaults.adapter = async (config) => ({
      data: { StatusCode: 400, IsSuccess: false, Message: 'Current password is incorrect.', Data: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await expect(backendClient.get('/whatever')).rejects.toMatchObject({
      message: 'Current password is incorrect.',
      response: {
        status: 400,
        data: { Message: 'Current password is incorrect.' },
      },
    });
  });

  it('defaults to a 400 status when IsSuccess is false but StatusCode is missing or still 200', async () => {
    const { backendClient } = await import('./backendClient');
    backendClient.defaults.adapter = async (config) => ({
      data: { StatusCode: 200, IsSuccess: false, Message: 'Username is already taken.', Data: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await expect(backendClient.get('/whatever')).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('falls back to a generic message when IsSuccess is false with no Message', async () => {
    const { backendClient } = await import('./backendClient');
    backendClient.defaults.adapter = async (config) => ({
      data: { StatusCode: 400, IsSuccess: false, Data: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await expect(backendClient.get('/whatever')).rejects.toMatchObject({
      message: 'The request could not be completed.',
    });
  });
});
