// Temporary in-memory data for the US7/US8 demo routes.
// Database-backed equivalents should eventually move into Prisma models and services.
export type GroupRole = 'admin' | 'member';

export type GroupMember = {
  userId: string;
  name: string;
  email: string;
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
  activeReservations: BundleReservation[];
  updatedAt: string;
  members: GroupMember[];
};

export type IngredientCatalogItem = {
  id: string;
  name: string;
};

export type PantryItem = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  ownerUserId: string;
  ownerName: string;
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
  sourceUserId: string;
  sourceName: string;
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
            email: 'vinayak@example.com',
            role: 'admin'
          },
          {
            userId: DEMO_MEMBER_USER_ID,
            name: 'Kartik',
            email: 'kartik@example.com',
            role: 'member'
          },
          {
            userId: 'user-member-2',
            name: 'Ani',
            email: 'ani@example.com',
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
          ingredientId: 'chicken-fillets',
          name: 'Chicken fillets',
          quantity: 2,
          unit: 'fillets',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak'
        },
        {
          ingredientId: 'mushrooms',
          name: 'Mushrooms',
          quantity: 2,
          unit: 'cups',
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: 'Kartik'
        },
        {
          ingredientId: 'cream',
          name: 'Cream',
          quantity: 1,
          unit: 'cups',
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: 'Kartik'
        },
        {
          ingredientId: 'garlic-cloves',
          name: 'Garlic',
          quantity: 8,
          unit: 'cloves',
          ownerUserId: 'user-member-2',
          ownerName: 'Ani'
        },
        {
          ingredientId: 'tomatoes',
          name: 'Tomatoes',
          quantity: 6,
          unit: 'whole',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak'
        },
        {
          ingredientId: 'pasta',
          name: 'Pasta',
          quantity: 2,
          unit: 'boxes',
          ownerUserId: 'user-member-2',
          ownerName: 'Ani'
        },
        {
          ingredientId: 'bread-loaf',
          name: 'Bread loaf',
          quantity: 1,
          unit: 'loaf',
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: 'Vinayak'
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

  return { groups, pantriesByGroup, bundleTemplatesByGroup };
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

  const releasedBundleId = group.selectedBundleId;
  group.selectedBundleId = bundleId;
  group.activeReservations = structuredClone(
    activeReservations
  );
  group.activeBundleVersion += 1;
  group.updatedAt = new Date().toISOString();

  return {
    group: structuredClone(group),
    releasedBundleId
  };
}
