export type GroupRole = "admin" | "member";

export type GroupMember = {
  userId: string;
  name: string;
  role: GroupRole;
};

export type GroupRecord = {
  id: string;
  name: string;
  allowMissingIngredients: boolean;
  updatedAt: string;
  members: GroupMember[];
};

export type PantryItem = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  ownerUserId: string;
  ownerName: string;
};

export type BundleCourseType = "appetizer" | "main" | "side" | "dessert";

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

export const DEMO_ADMIN_USER_ID = "user-admin-1";
export const DEMO_MEMBER_USER_ID = "user-member-1";

type DemoState = {
  groups: Map<string, GroupRecord>;
  pantriesByGroup: Map<string, PantryItem[]>;
  bundleTemplatesByGroup: Map<string, BundleTemplate[]>;
};

function createDemoState(): DemoState {
  const groupId = "dorm-dinner-crew";

  const groups = new Map<string, GroupRecord>([
    [
      groupId,
      {
        id: groupId,
        name: "Dorm Dinner Crew",
        allowMissingIngredients: false,
        updatedAt: "2026-05-11T07:00:00.000Z",
        members: [
          { userId: DEMO_ADMIN_USER_ID, name: "Vinayak", role: "admin" },
          { userId: DEMO_MEMBER_USER_ID, name: "Kartik", role: "member" },
          { userId: "user-member-2", name: "Ani", role: "member" },
        ],
      },
    ],
  ]);

  const pantriesByGroup = new Map<string, PantryItem[]>([
    [
      groupId,
      [
        {
          ingredientId: "chicken-fillets",
          name: "Chicken fillets",
          quantity: 2,
          unit: "fillets",
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: "Vinayak",
        },
        {
          ingredientId: "mushrooms",
          name: "Mushrooms",
          quantity: 2,
          unit: "cups",
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: "Kartik",
        },
        {
          ingredientId: "cream",
          name: "Cream",
          quantity: 1,
          unit: "cups",
          ownerUserId: DEMO_MEMBER_USER_ID,
          ownerName: "Kartik",
        },
        {
          ingredientId: "garlic-cloves",
          name: "Garlic",
          quantity: 8,
          unit: "cloves",
          ownerUserId: "user-member-2",
          ownerName: "Ani",
        },
        {
          ingredientId: "tomatoes",
          name: "Tomatoes",
          quantity: 6,
          unit: "whole",
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: "Vinayak",
        },
        {
          ingredientId: "pasta",
          name: "Pasta",
          quantity: 2,
          unit: "boxes",
          ownerUserId: "user-member-2",
          ownerName: "Ani",
        },
        {
          ingredientId: "bread-loaf",
          name: "Bread loaf",
          quantity: 1,
          unit: "loaf",
          ownerUserId: DEMO_ADMIN_USER_ID,
          ownerName: "Vinayak",
        },
      ],
    ],
  ]);

  const bundleTemplatesByGroup = new Map<string, BundleTemplate[]>([
    [
      groupId,
      [
        {
          id: "bundle-creamy-tuscan-night",
          title: "Creamy Tuscan Night",
          courses: [
            { type: "appetizer", title: "Garlic Tomato Toasts" },
            { type: "main", title: "Creamy Tuscan Chicken" },
          ],
          ingredientList: [
            { ingredientId: "bread-loaf", name: "Bread loaf", quantity: 1, unit: "loaf" },
            { ingredientId: "tomatoes", name: "Tomatoes", quantity: 2, unit: "whole" },
            { ingredientId: "garlic-cloves", name: "Garlic", quantity: 3, unit: "cloves" },
            { ingredientId: "chicken-fillets", name: "Chicken fillets", quantity: 2, unit: "fillets" },
            { ingredientId: "mushrooms", name: "Mushrooms", quantity: 1, unit: "cups" },
            { ingredientId: "cream", name: "Cream", quantity: 1, unit: "cups" },
          ],
          instructions: [
            "Toast the bread and rub it with garlic for the appetizer base.",
            "Simmer the chicken with mushrooms, tomatoes, and cream until the sauce thickens.",
          ],
          rationale: "Fits a cozy shared dinner using ingredients already in the group pantry.",
        },
        {
          id: "bundle-saffron-pasta-night",
          title: "Saffron Pasta Night",
          courses: [
            { type: "main", title: "Saffron Tomato Pasta" },
            { type: "side", title: "Warm Herb Bread" },
          ],
          ingredientList: [
            { ingredientId: "pasta", name: "Pasta", quantity: 1, unit: "boxes" },
            { ingredientId: "tomatoes", name: "Tomatoes", quantity: 3, unit: "whole" },
            { ingredientId: "garlic-cloves", name: "Garlic", quantity: 2, unit: "cloves" },
            { ingredientId: "saffron-threads", name: "Saffron threads", quantity: 1, unit: "tbsp" },
            { ingredientId: "bread-loaf", name: "Bread loaf", quantity: 1, unit: "loaf" },
          ],
          instructions: [
            "Boil the pasta and build a tomato sauce with garlic.",
            "Finish the sauce with saffron threads and serve with warm bread.",
          ],
          rationale: "A pasta-forward bundle with a fancier flavor profile for a weekend group meal.",
        },
        {
          id: "bundle-bruschetta-board",
          title: "Bruschetta Board",
          courses: [
            { type: "appetizer", title: "Tomato Basil Bruschetta" },
            { type: "side", title: "Herb Salad" },
          ],
          ingredientList: [
            { ingredientId: "bread-loaf", name: "Bread loaf", quantity: 1, unit: "loaf" },
            { ingredientId: "tomatoes", name: "Tomatoes", quantity: 4, unit: "whole" },
            { ingredientId: "garlic-cloves", name: "Garlic", quantity: 1, unit: "cloves" },
            { ingredientId: "basil-leaves", name: "Basil leaves", quantity: 10, unit: "leaves" },
          ],
          instructions: [
            "Toast the bread and top with chopped tomatoes and garlic.",
            "Scatter basil leaves over the board right before serving.",
          ],
          rationale: "Simple crowd-pleaser that becomes viable if the group is willing to shop for a fresh herb.",
        },
      ],
    ],
  ]);

  return { groups, pantriesByGroup, bundleTemplatesByGroup };
}

let demoState = createDemoState();

export function resetDemoState() {
  demoState = createDemoState();
}

export function getGroupRecord(groupId: string) {
  const group = demoState.groups.get(groupId);
  return group ? structuredClone(group) : undefined;
}

export function getGroupPantry(groupId: string) {
  return structuredClone(demoState.pantriesByGroup.get(groupId) ?? []);
}

export function getBundleTemplates(groupId: string) {
  return structuredClone(demoState.bundleTemplatesByGroup.get(groupId) ?? []);
}

export function updateAllowMissingIngredientsSetting(groupId: string, allowMissingIngredients: boolean) {
  const group = demoState.groups.get(groupId);

  if (!group) {
    return undefined;
  }

  group.allowMissingIngredients = allowMissingIngredients;
  group.updatedAt = new Date().toISOString();
  return structuredClone(group);
}
