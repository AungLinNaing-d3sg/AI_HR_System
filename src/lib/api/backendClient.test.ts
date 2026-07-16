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
});
