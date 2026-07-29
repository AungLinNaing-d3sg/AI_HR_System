// @types/node marks `NODE_ENV` as a readonly property of `ProcessEnv`; these
// tests intentionally flip it between reads to exercise both branches of
// logger.ts's module-level `isProduction` check.
function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true, writable: true });
}

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    setNodeEnv(originalEnv);
  });

  describe('in a non-production environment', () => {
    it('forwards info/warn/error/debug to the console with an [LEVEL] prefix', async () => {
      jest.resetModules();
      setNodeEnv('test');
      const { logger } = await import('./logger');

      const info = jest.spyOn(console, 'info').mockImplementation(() => {});
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});

      logger.info('info message', 1);
      logger.warn('warn message');
      logger.error('error message');
      logger.debug('debug message');

      expect(info).toHaveBeenCalledWith('[INFO]', 'info message', 1);
      expect(warn).toHaveBeenCalledWith('[WARN]', 'warn message');
      expect(error).toHaveBeenCalledWith('[ERROR]', 'error message');
      expect(debug).toHaveBeenCalledWith('[DEBUG]', 'debug message');
    });
  });

  describe('in production', () => {
    it('no-ops instead of logging to the console', async () => {
      jest.resetModules();
      setNodeEnv('production');
      const { logger } = await import('./logger');

      const info = jest.spyOn(console, 'info').mockImplementation(() => {});
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});

      logger.info('should not be logged');
      logger.warn('should not be logged');
      logger.error('should not be logged');
      logger.debug('should not be logged');

      expect(info).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(debug).not.toHaveBeenCalled();
    });
  });
});
