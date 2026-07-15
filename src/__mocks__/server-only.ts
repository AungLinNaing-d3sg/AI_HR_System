// Test-only stand-in for the `server-only` package.
//
// The real package throws unconditionally on import as a build-time guard
// (Next.js aliases it to a no-op vs. a throwing stub depending on whether a
// module ends up in a server or client bundle). That aliasing doesn't exist
// under Jest, so modules that `import 'server-only'` are mapped to this
// empty module via `moduleNameMapper` in jest.config.ts instead.
export {};
