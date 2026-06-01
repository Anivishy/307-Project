import type { BundleCourseType, BundleTemplate } from '../demo-store';

export type BundleGenerationRequest = {
  courseTypes?: BundleCourseType[];
  servings?: number;
  cuisine?: string;
  query?: string;
};

export type StoredCandidateSet = {
  candidateSetId: string;
  groupId: string;
  templates: BundleTemplate[];
  generatedAt: string;
  pantrySnapshotVersion: number;
  activeBundleVersion: number;
  source: 'demo' | 'mock' | 'spoonacular';
  request: BundleGenerationRequest;
};

const candidateSetsByGroup = new Map<string, StoredCandidateSet>();

export function resetCandidateStoreForTests() {
  candidateSetsByGroup.clear();
}

export function getStoredCandidateSet(groupId: string) {
  const stored = candidateSetsByGroup.get(groupId);
  return stored ? structuredClone(stored) : undefined;
}

export function replaceStoredCandidateSet(
  groupId: string,
  candidateSet: StoredCandidateSet
) {
  candidateSetsByGroup.set(groupId, structuredClone(candidateSet));
  return getStoredCandidateSet(groupId)!;
}

export function appendStoredCandidateTemplate(
  groupId: string,
  template: BundleTemplate
) {
  const existing = candidateSetsByGroup.get(groupId);

  if (!existing) {
    return undefined;
  }

  existing.templates.push(structuredClone(template));
  existing.generatedAt = new Date().toISOString();
  return structuredClone(existing);
}

export function listStoredCandidateTemplates(groupId: string) {
  return structuredClone(
    candidateSetsByGroup.get(groupId)?.templates ?? []
  );
}
