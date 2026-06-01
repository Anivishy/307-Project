import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetCandidateStoreForTests } from './bundle-candidate-store';
import {
  createBundleGenerationRequest,
  readGeneratedBundleCandidates
} from './bundle-generation-service';
import { resetDemoState } from '../demo-store';

describe('bundle generation service', () => {
  beforeEach(() => {
    vi.stubEnv('SPOONACULAR_MOCK_GENERATION', 'true');
    resetDemoState();
    resetCandidateStoreForTests();
  });

  it('reads demo bundle candidates when generation is mocked', async () => {
    const payload = await readGeneratedBundleCandidates(
      'dorm-dinner-crew',
      'user-admin-1'
    );

    expect(payload.candidates.length).toBeGreaterThan(0);
    expect(payload.generationSource).toBe('mock');
  });

  it('generates and stores mock bundle candidates for demo groups', async () => {
    const payload = await createBundleGenerationRequest(
      'dorm-dinner-crew',
      'user-admin-1',
      {
        courseTypes: ['main', 'side'],
        cuisine: 'italian'
      }
    );

    expect(payload.candidates.length).toBeGreaterThan(0);
    expect(payload.generationSource).toBe('mock');
    expect(payload.candidates[0]?.courses?.length).toBeGreaterThan(0);
  });
});
