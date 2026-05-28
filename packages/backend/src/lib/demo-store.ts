// Temporary in-memory data for the US7/US8 demo routes.
// Database-backed equivalents should eventually move into Prisma models and services.
export type GroupRole = 'admin' | 'member';

export type GroupMember = {
  userId: string;
  name: string;
  role: GroupRole;
};

export type GroupRecord = {
  id: string;
  name: string;
  allowMissingIngredients: boolean;
  staplesEnabled: boolean;
  customStaples: string[];
  pantrySnapshotVersion: number;
  activeBundleVersion: number;
  selectedBundleId: string | null;
  activeReservations: InventoryReservation[];
  updatedAt: string;
  members: GroupMember[];
};

export type IngredientCatalogItem = {
  id: string;
  name: string;
};

export type PantryItem = {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  ownerUserId: string;
  ownerName: string;
  lastUpdatedBy: 'bundleSelection' | 'adminPantryEdit' | null;
  lastUpdatedAt: string | null;
};

export type BundleCourseType =
  | 'appetizer'
  | 'main'
  | 'side'
  | 'dessert';

export type BundleCourse = {
  type: BundleCourseType;
  title: string;
};

export type BundleIngredient = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
};

export type BundleTemplate = {
  id: string;
  title: string;
  courses: BundleCourse[];
  ingredientList: BundleIngredient[];
  instructions: string[];
  rationale: string;
};

export type BundleReservation = {
  bundleId: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  sourceQuantity: number;
  sourceUnit: string;
  sourceUserId: string;
  sourceName: string;
};

export type InventoryReservation = BundleReservation & {
  id: string;
  pantryItemId: string;
  reservedQuantity: number;
  createdAt: string;
};

export type ActivityEventType =
  | 'bundleSelection'
  | 'adminPantryEdit'
  | 'softPreferenceOverride';

export type ActivityLogEntry = {
  id: string;
  groupId: string;
  actorId: string;
  actorName: string;
  eventType: ActivityEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export const DEMO_ADMIN_USER_ID = 'user-admin-1';
export const DEMO_MEMBER_USER_ID = 'user-member-1';

const INGREDIENT_CATALOG: IngredientCatalogItem[] = [
  { id: 'olive-oil', name: 'Olive oil' },
  { id: 'butter', name: 'Butter' },
  { id: 'salt', name: 'Salt' },
  { id: 'pepper', name: 'Pepper' },
  { id: 'basil-leaves', name: 'Basil leaves' },
  { id: 'thyme', name: 'Fresh thyme' },
  { id: 'sesame-oil', name: 'Sesame oil' },
  { id: 'parmesan', name: 'Parmesan' },
  { id: 'saffron-threads', name: 'Saffron threads' },
  { id: 'bread-loaf', name: 'Bread loaf' },
  { id: 'tomatoes', name: 'Tomatoes' },
  { id: 'garlic-cloves', name: 'Garlic' },
  { id: 'pasta', name: 'Pasta' },
  { id: 'chicken-fillets', name: 'Chicken fillets' },
  { id: 'mushrooms', name: 'Mushrooms' },
  { id: 'cream', name: 'Cream' }
];

const DEFAULT_STAPLES_PRESET_IDS = [
  'olive-oil',
  'butter',
  'salt',
  'pepper'
];

type DemoState = {
  groups: Map<string, GroupRecord>;
  pantriesByGroup: Map<string, PantryItem[]>;
  bundleTemplatesByGroup: Map<string, BundleTemplate[]>;
  activityLogsByGroup: Map<string, ActivityLogEntry[]>;
  nextReservationNumber: number;
  nextActivityNumber: number;
};

function createDemoState(): DemoState {
  const groupId = 'dorm-dinner-crew';

  const groups = new Map<string, GroupRecord>([
    [
      groupId,
      {
        id: groupId,
        name: 'Dorm Dinner Crew',
        allowMissingIngredients: false,
        staplesEnabled: false,
        customStaples: [],
        pantrySnapshotVersion: 3,
        activeBundleVersion: 1,
        selectedBundleId: null,
        activeReservations: [],
        updatedAt: '2026-05-11T07:00:00.000Z',
        members: [
          {
            userId: DEMO_ADMIN_USER_ID,
            name: 'Vinayak',
            role: 'admin'
          },
          {
            userId: DEMO_MEMBER_USER_ID,
            name: 'Kartik',
            role: 'member'
          },
          {
            userId: 'user-member-2',
            name: 'Ani',
            role: 'member'
          }
        ]
      }
    ],
    [
      'late-night-snacks',
      {
        id: 'late-night-snacks',
        name: 'Late Night Snacks',
        allowMissingIngredients: false,
        staplesEnabled: false,
        customStaples: [],
        pantrySnapshotVersion: 1,
        activeBundleVersion: 1,
        selectedBundleId: null,
        activeReservations: [],
        updatedAt: '2026-05-11T07:00:00.000Z',
        members: [
          {
            userId: DEMO_MEMBER_USER_ID,
            name: 'Kartik',
            role: 'admin'
          },
          {
            userId: 'user-member-2',
            name: 'Ani',
            role: 'member'
          }
        ]
      }
    ]
  ]);

  const pantriesByGroup = new Map<string, PantryItem[]>([
    [
      groupId,
      [
        {
          id: 'pantry-vinayak-chicken',
          ingredientId: 'chicken-fillets',
          name: 'Chicken fillets',
          quantity: 2,
          unit: 'fillets',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-kartik-mushrooms',
          ingredientId: 'mushrooms',
          name: 'Mushrooms',
          quantity: 2,
          unit: 'cups',
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: 'Kartik',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-kartik-cream',
          ingredientId: 'cream',
          name: 'Cream',
          quantity: 1,
          unit: 'cups',
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: 'Kartik',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-ani-garlic',
          ingredientId: 'garlic-cloves',
          name: 'Garlic',
          quantity: 8,
          unit: 'cloves',
          ownerUserId: 'user-member-2',
          ownerName: 'Ani',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-vinayak-tomatoes',
          ingredientId: 'tomatoes',
          name: 'Tomatoes',
          quantity: 6,
          unit: 'whole',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-ani-pasta',
          ingredientId: 'pasta',
          name: 'Pasta',
          quantity: 2,
          unit: 'boxes',
          ownerUserId: 'user-member-2',
          ownerName: 'Ani',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        },
        {
          id: 'pantry-vinayak-bread',
          ingredientId: 'bread-loaf',
          name: 'Bread loaf',
          quantity: 1,
          unit: 'loaf',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak',
          lastUpdatedBy: null,
          lastUpdatedAt: null
        }
      ]
    ]
  ]);

  const bundleTemplatesByGroup = new Map<
    string,
    BundleTemplate[]
  >([
    [
      groupId,
      [
        {
          id: 'bundle-creamy-tuscan-night',
          title: 'Creamy Tuscan Night',
          courses: [
            {
              type: 'appetizer',
              title: 'Garlic Tomato Toasts'
            },
            { type: 'main', title: 'Creamy Tuscan Chicken' }
          ],
          ingredientList: [
            {
              ingredientId: 'bread-loaf',
              name: 'Bread loaf',
              quantity: 1,
              unit: 'loaf'
            },
            {
              ingredientId: 'tomatoes',
              name: 'Tomatoes',
              quantity: 2,
              unit: 'whole'
            },
            {
              ingredientId: 'garlic-cloves',
              name: 'Garlic',
              quantity: 3,
              unit: 'cloves'
            },
            {
              ingredientId: 'chicken-fillets',
              name: 'Chicken fillets',
              quantity: 2,
              unit: 'fillets'
            },
            {
              ingredientId: 'mushrooms',
              name: 'Mushrooms',
              quantity: 1,
              unit: 'cups'
            },
            {
              ingredientId: 'cream',
              name: 'Cream',
              quantity: 1,
              unit: 'cups'
            }
          ],
          instructions: [
            'Toast the bread and rub it with garlic for the appetizer base.',
            'Simmer the chicken with mushrooms, tomatoes, and cream until the sauce thickens.'
          ],
          rationale:
            'Fits a cozy shared dinner using ingredients already in the group pantry.'
        },
        {
          id: 'bundle-saffron-pasta-night',
          title: 'Saffron Pasta Night',
          courses: [
            { type: 'main', title: 'Saffron Tomato Pasta' },
            { type: 'side', title: 'Warm Herb Bread' }
          ],
          ingredientList: [
            {
              ingredientId: 'pasta',
              name: 'Pasta',
              quantity: 1,
              unit: 'boxes'
            },
            {
              ingredientId: 'tomatoes',
              name: 'Tomatoes',
              quantity: 3,
              unit: 'whole'
            },
            {
              ingredientId: 'garlic-cloves',
              name: 'Garlic',
              quantity: 2,
              unit: 'cloves'
            },
            {
              ingredientId: 'saffron-threads',
              name: 'Saffron threads',
              quantity: 1,
              unit: 'tbsp'
            },
            {
              ingredientId: 'salt',
              name: 'Salt',
              quantity: 1,
              unit: 'tsp'
            },
            {
              ingredientId: 'bread-loaf',
              name: 'Bread loaf',
              quantity: 1,
              unit: 'loaf'
            }
          ],
          instructions: [
            'Boil the pasta and build a tomato sauce with garlic.',
            'Finish the sauce with saffron threads and serve with warm bread.'
          ],
          rationale:
            'A pasta-forward bundle with a fancier flavor profile for a weekend group meal.'
        },
        {
          id: 'bundle-garden-pasta-board',
          title: 'Garden Pasta Board',
          courses: [
            { type: 'main', title: 'Garlic Garden Pasta' },
            { type: 'side', title: 'Toasted Bread Board' }
          ],
          ingredientList: [
            {
              ingredientId: 'pasta',
              name: 'Pasta',
              quantity: 1,
              unit: 'boxes'
            },
            {
              ingredientId: 'tomatoes',
              name: 'Tomatoes',
              quantity: 2,
              unit: 'whole'
            },
            {
              ingredientId: 'garlic-cloves',
              name: 'Garlic',
              quantity: 2,
              unit: 'cloves'
            },
            {
              ingredientId: 'olive-oil',
              name: 'Olive oil',
              quantity: 2,
              unit: 'tbsp'
            },
            {
              ingredientId: 'salt',
              name: 'Salt',
              quantity: 1,
              unit: 'tsp'
            },
            {
              ingredientId: 'bread-loaf',
              name: 'Bread loaf',
              quantity: 1,
              unit: 'loaf'
            }
          ],
          instructions: [
            'Boil the pasta and toss it with tomatoes, garlic, and olive oil.',
            'Season with salt and serve with thick slices of toasted bread.'
          ],
          rationale:
            'A pantry-driven pasta board that works well if the household treats common basics as staples.'
        },
        {
          id: 'bundle-bruschetta-board',
          title: 'Bruschetta Board',
          courses: [
            {
              type: 'appetizer',
              title: 'Tomato Basil Bruschetta'
            },
            { type: 'side', title: 'Herb Salad' }
          ],
          ingredientList: [
            {
              ingredientId: 'bread-loaf',
              name: 'Bread loaf',
              quantity: 1,
              unit: 'loaf'
            },
            {
              ingredientId: 'tomatoes',
              name: 'Tomatoes',
              quantity: 4,
              unit: 'whole'
            },
            {
              ingredientId: 'garlic-cloves',
              name: 'Garlic',
              quantity: 1,
              unit: 'cloves'
            },
            {
              ingredientId: 'basil-leaves',
              name: 'Basil leaves',
              quantity: 10,
              unit: 'leaves'
            }
          ],
          instructions: [
            'Toast the bread and top with chopped tomatoes and garlic.',
            'Scatter basil leaves over the board right before serving.'
          ],
          rationale:
            'Simple crowd-pleaser that becomes viable if the group is willing to shop for a fresh herb.'
        }
      ]
    ]
  ]);

  const activityLogsByGroup = new Map<
    string,
    ActivityLogEntry[]
  >([[groupId, []]]);

  return {
    groups,
    pantriesByGroup,
    bundleTemplatesByGroup,
    activityLogsByGroup,
    nextReservationNumber: 1,
    nextActivityNumber: 1
  };
}

let demoState = createDemoState();

export function resetDemoState() {
  // Tests use this to avoid one test's PATCH changing the next test's starting state.
  demoState = createDemoState();
}

export function getGroupRecord(groupId: string) {
  // Return clones so route/service code cannot accidentally mutate demo state without updateGroupRecord.
  const group = demoState.groups.get(groupId);
  return group ? structuredClone(group) : undefined;
}

export function getGroupPantry(groupId: string) {
  return structuredClone(
    demoState.pantriesByGroup.get(groupId) ?? []
  );
}

export function addDemoPantryItemForTests(
  groupId: string,
  item: PantryItem
) {
  const pantry = demoState.pantriesByGroup.get(groupId) ?? [];
  pantry.push(structuredClone(item));
  demoState.pantriesByGroup.set(groupId, pantry);
}

export function getGroupActivityLog(groupId: string) {
  return structuredClone(
    demoState.activityLogsByGroup.get(groupId) ?? []
  ).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime()
  );
}

function getMemberName(group: GroupRecord, actorId: string) {
  return (
    group.members.find((member) => member.userId === actorId)
      ?.name ?? 'Admin'
  );
}

export function recordActivityLog(
  groupId: string,
  actorId: string,
  eventType: ActivityEventType,
  payload: Record<string, unknown>
) {
  const group = demoState.groups.get(groupId);

  if (!group) {
    return undefined;
  }

  const entry: ActivityLogEntry = {
    id: `activity-${demoState.nextActivityNumber++}`,
    groupId,
    actorId,
    actorName: getMemberName(group, actorId),
    eventType,
    payload,
    createdAt: new Date().toISOString()
  };
  const entries =
    demoState.activityLogsByGroup.get(groupId) ?? [];
  entries.unshift(entry);
  demoState.activityLogsByGroup.set(groupId, entries);
  return structuredClone(entry);
}

export function recordAdminPantryEdit(
  groupId: string,
  actorId: string,
  pantryItemId: string,
  quantity: number
) {
  const pantry = demoState.pantriesByGroup.get(groupId) ?? [];
  const item = pantry.find(
    (pantryItem) => pantryItem.id === pantryItemId
  );

  if (item) {
    item.quantity = quantity;
    item.lastUpdatedBy = 'adminPantryEdit';
    item.lastUpdatedAt = new Date().toISOString();
  }

  return recordActivityLog(
    groupId,
    actorId,
    'adminPantryEdit',
    {
      pantryItemId,
      quantity
    }
  );
}

export function recordSoftPreferenceOverride(
  groupId: string,
  actorId: string,
  memberUserId: string,
  preference: string,
  reason: string
) {
  return recordActivityLog(
    groupId,
    actorId,
    'softPreferenceOverride',
    {
      memberUserId,
      preference,
      reason
    }
  );
}

export function getBundleTemplates(groupId: string) {
  return structuredClone(
    demoState.bundleTemplatesByGroup.get(groupId) ?? []
  );
}

export function getIngredientCatalog() {
  return structuredClone(INGREDIENT_CATALOG);
}

export function getDefaultStaplesPreset() {
  return INGREDIENT_CATALOG.filter((item) =>
    DEFAULT_STAPLES_PRESET_IDS.includes(item.id)
  );
}

export function resolveIngredientIds(ids: string[]) {
  const idSet = new Set(ids);
  return INGREDIENT_CATALOG.filter((item) =>
    idSet.has(item.id)
  );
}

export function updateGroupRecord(
  groupId: string,
  updates: Partial<
    Pick<
      GroupRecord,
      | 'allowMissingIngredients'
      | 'staplesEnabled'
      | 'customStaples'
    >
  >
) {
  const group = demoState.groups.get(groupId);

  if (!group) {
    return undefined;
  }

  if (typeof updates.allowMissingIngredients === 'boolean') {
    group.allowMissingIngredients =
      updates.allowMissingIngredients;
  }

  if (typeof updates.staplesEnabled === 'boolean') {
    group.staplesEnabled = updates.staplesEnabled;
  }

  if (Array.isArray(updates.customStaples)) {
    group.customStaples = [...new Set(updates.customStaples)];
  }

  group.updatedAt = new Date().toISOString();
  return structuredClone(group);
}

export function bumpPantrySnapshotVersion(groupId: string) {
  const group = demoState.groups.get(groupId);

  if (!group) {
    return undefined;
  }

  group.pantrySnapshotVersion += 1;
  group.updatedAt = new Date().toISOString();
  return structuredClone(group);
}

export function replaceActiveBundle(
  groupId: string,
  bundleId: string,
  activeReservations: BundleReservation[]
) {
  const group = demoState.groups.get(groupId);

  if (!group) {
    return undefined;
  }

  const pantry = demoState.pantriesByGroup.get(groupId) ?? [];
  const releasedBundleId = group.selectedBundleId;
  const releasedReservations = group.activeReservations;
  const changedOwnerIds = new Set<string>();
  const now = new Date().toISOString();

  for (const reservation of releasedReservations) {
    const item = pantry.find(
      (pantryItem) => pantryItem.id === reservation.pantryItemId
    );

    if (!item) {
      continue;
    }

    item.quantity += reservation.sourceQuantity;
    item.lastUpdatedBy = 'bundleSelection';
    item.lastUpdatedAt = now;
    changedOwnerIds.add(item.ownerUserId);
  }

  const appliedReservations: InventoryReservation[] = [];

  for (const reservation of activeReservations) {
    if (reservation.sourceUserId === 'group-staples') {
      continue;
    }

    const item = pantry.find(
      (pantryItem) =>
        pantryItem.ingredientId === reservation.ingredientId &&
        pantryItem.ownerUserId === reservation.sourceUserId &&
        pantryItem.unit === reservation.sourceUnit
    );

    if (!item) {
      continue;
    }

    item.quantity = Math.max(
      0,
      item.quantity - reservation.sourceQuantity
    );
    item.lastUpdatedBy = 'bundleSelection';
    item.lastUpdatedAt = now;
    changedOwnerIds.add(item.ownerUserId);
    appliedReservations.push({
      ...reservation,
      id: `reservation-${demoState.nextReservationNumber++}`,
      pantryItemId: item.id,
      reservedQuantity: reservation.quantity,
      createdAt: now
    });
  }

  group.selectedBundleId = bundleId;
  group.activeReservations = structuredClone(
    appliedReservations
  );
  group.activeBundleVersion += 1;
  group.updatedAt = new Date().toISOString();

  const groupIdsToBump = new Set<string>();

  for (const ownerId of changedOwnerIds) {
    for (const ownerGroup of demoState.groups.values()) {
      if (
        ownerGroup.members.some(
          (member) => member.userId === ownerId
        )
      ) {
        groupIdsToBump.add(ownerGroup.id);
      }
    }
  }

  for (const ownerGroupId of groupIdsToBump) {
    const ownerGroup = demoState.groups.get(ownerGroupId);
    if (ownerGroup) {
      ownerGroup.pantrySnapshotVersion += 1;
      ownerGroup.updatedAt = now;
    }
  }

  return {
    group: structuredClone(group),
    releasedBundleId,
    releasedReservations: structuredClone(releasedReservations),
    appliedReservations: structuredClone(appliedReservations)
  };
}
