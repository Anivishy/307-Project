export type ConstraintType = "allergy" | "medicalRestriction" | "neverInclude";

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  commonUnits: string[];
  tags: string[];
};

export type IngredientSummary = Pick<Ingredient, "id" | "name" | "category" | "commonUnits">;

export type UserConstraints = {
  userId: string;
  allergies: string[];
  medicalRestrictions: string[];
  neverIncludeIngredientIds: string[];
  diets?: string[];
  intolerances?: string[];
  preferredCuisines?: string[];
  excludedCuisines?: string[];
  dislikedIngredients?: string[];
  spiceLevel?: string | null;
  updatedAt: string;
};

export type UserConstraintsInput = Partial<
  Pick<
    UserConstraints,
    | "allergies"
    | "medicalRestrictions"
    | "neverIncludeIngredientIds"
    | "diets"
    | "intolerances"
    | "preferredCuisines"
    | "excludedCuisines"
    | "dislikedIngredients"
    | "spiceLevel"
  >
>;

export type CandidateIngredient = {
  id: string;
  name: string;
  tags?: string[];
};

export type CandidateCourse = {
  id?: string;
  name: string;
  ingredients: CandidateIngredient[];
};

export type CandidateBundle = {
  id?: string;
  courses: CandidateCourse[];
};

export type ConstraintViolation = {
  userId: string;
  constraintType: ConstraintType;
  constraintValue: string;
  ingredientId: string;
  ingredientName: string;
  courseId?: string;
  courseName: string;
};

export type HardConstraintValidationResult = {
  allowed: boolean;
  violations: ConstraintViolation[];
};

export type RejectedCandidate = {
  candidate: CandidateBundle;
  violations: ConstraintViolation[];
};
