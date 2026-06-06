// Global test setup: make the backend suite hermetic.
//
// Tests must not depend on a developer's local `.env.local` (which may contain
// a real SPOONACULAR_API_KEY and therefore flip Spoonacular calls into "live"
// mode). We force mock mode here so generation/catalog tests behave the same on
// every machine and in CI. Individual tests that exercise the live path still
// override these with `vi.stubEnv(...)`, which takes priority because
// loadBackendEnv() never overrides variables already present in process.env.
process.env.SPOONACULAR_MOCK_CATALOG = 'true';
process.env.SPOONACULAR_MOCK_GENERATION = 'true';
