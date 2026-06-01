import { listProfileConstraintsForUsers } from '../profile-constraints-service';
import { listConstraintsForUsers } from '../constraints/store';
import type { UserConstraints } from '../constraints/types';
import { isDemoGroupId } from './group-context';

export type AggregatedMemberPreferences = {
  diets: string[];
  intolerances: string[];
  preferredCuisines: string[];
  excludedCuisines: string[];
  dislikedIngredients: string[];
  spiceLevels: string[];
};

function unique(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim() ?? '')
        .filter((value) => value.length > 0)
    )
  ];
}

export async function loadMemberConstraints(
  memberProfileIds: string[],
  isDemoGroup: boolean
): Promise<UserConstraints[]> {
  if (isDemoGroup || memberProfileIds.some((id) => isDemoGroupId(id))) {
    return listConstraintsForUsers(memberProfileIds);
  }

  return listProfileConstraintsForUsers(memberProfileIds);
}

export function aggregateMemberPreferences(
  memberConstraints: UserConstraints[]
): AggregatedMemberPreferences {
  return {
    diets: unique(
      memberConstraints.flatMap((constraints) => constraints.diets ?? [])
    ),
    intolerances: unique(
      memberConstraints.flatMap(
        (constraints) => constraints.intolerances ?? []
      )
    ),
    preferredCuisines: unique(
      memberConstraints.flatMap(
        (constraints) => constraints.preferredCuisines ?? []
      )
    ),
    excludedCuisines: unique(
      memberConstraints.flatMap(
        (constraints) => constraints.excludedCuisines ?? []
      )
    ),
    dislikedIngredients: unique(
      memberConstraints.flatMap(
        (constraints) => constraints.dislikedIngredients ?? []
      )
    ),
    spiceLevels: unique(
      memberConstraints.map((constraints) => constraints.spiceLevel)
    )
  };
}
