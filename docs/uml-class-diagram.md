# UML Class Diagram

**Last updated: June 5, 2026**

This diagram models the RecipeCollab domain (the **Model** in our MVC design).
It is derived directly from [`prisma/schema.prisma`](../prisma/schema.prisma),
which is the schema of record; whenever the schema changes, update this diagram
and the date above.

**Diagram source file:** [`docs/diagrams/class-diagram.mmd`](diagrams/class-diagram.mmd)
(Mermaid). The block below renders on GitHub and is kept in sync with that
source. To edit it visually, paste the `.mmd` file into
[mermaid.live](https://mermaid.live).

```mermaid
classDiagram
    direction LR

    class Profile {
        +UUID id
        +String email
        +String displayName
        +String[] allergies
        +String[] medicalRestrictions
        +String[] diets
        +String[] intolerances
        +String[] preferredCuisines
        +String[] excludedCuisines
        +String[] dislikedIngredients
        +String spiceLevel
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Ingredient {
        +UUID id
        +UUID ownerId
        +String canonicalIngredientId
        +String name
        +Decimal quantity
        +String unit
        +String notes
    }

    class Group {
        +UUID id
        +UUID ownerId
        +String name
        +String description
        +String inviteCode
        +Int pantrySnapshotVersion
        +Int activeBundleVersion
        +String selectedBundleId
        +Boolean allowMissingIngredients
        +Boolean staplesEnabled
        +String[] customStaples
    }

    class GroupMember {
        +UUID id
        +UUID groupId
        +UUID profileId
        +GroupRole role
        +DateTime joinedAt
    }

    class MenuRequest {
        +UUID id
        +UUID groupId
        +UUID requestedById
        +String prompt
        +String cuisine
        +Int mealCount
        +MenuRequestStatus status
    }

    class Menu {
        +UUID id
        +UUID groupId
        +UUID requestId
        +String title
        +String summary
    }

    class Recipe {
        +UUID id
        +UUID menuId
        +String title
        +MealCategory category
        +String instructions
        +Int servings
    }

    class RecipeIngredient {
        +UUID id
        +UUID recipeId
        +UUID fromProfileId
        +String name
        +Decimal quantity
        +String unit
        +String notes
    }

    class Notification {
        +UUID id
        +UUID recipientId
        +UUID actorId
        +UUID groupId
        +UUID ingredientId
        +NotificationType type
        +String title
        +String message
        +Json metadata
        +DateTime readAt
        +DateTime createdAt
    }

    class GroupRole {
        <<enumeration>>
        OWNER
        ADMIN
        MEMBER
    }

    class MenuRequestStatus {
        <<enumeration>>
        PENDING
        COMPLETED
        FAILED
    }

    class MealCategory {
        <<enumeration>>
        APPETIZER
        MAIN
        SIDE
        DESSERT
        DRINK
        OTHER
    }

    class NotificationType {
        <<enumeration>>
        INGREDIENT_ADDED
    }

    Profile "1" --> "0..*" Ingredient : owns
    Profile "1" --> "0..*" Group : owns
    Profile "1" --> "0..*" GroupMember : has
    Group "1" --> "0..*" GroupMember : contains
    Profile "1" --> "0..*" MenuRequest : requests
    Group "1" --> "0..*" MenuRequest : receives
    MenuRequest "1" --> "0..1" Menu : produces
    Group "1" --> "0..*" Menu : owns
    Menu "1" --> "0..*" Recipe : contains
    Recipe "1" --> "0..*" RecipeIngredient : lists
    Profile "0..1" --> "0..*" RecipeIngredient : contributes
    Profile "1" --> "0..*" Notification : receives
    Profile "0..1" --> "0..*" Notification : acted
    Group "0..1" --> "0..*" Notification : scopes
    Ingredient "0..1" --> "0..*" Notification : about

    GroupMember ..> GroupRole : uses
    MenuRequest ..> MenuRequestStatus : uses
    Recipe ..> MealCategory : uses
    Notification ..> NotificationType : uses
```

## Reading the diagram

- **Entities** are the persisted domain classes (Prisma models → Postgres
  tables). Attributes show the key fields; audit timestamps (`createdAt` /
  `updatedAt`) are omitted on most classes for readability.
- **Solid arrows** (`-->`) are associations/relationships with multiplicities
  (e.g. a `Profile` owns `0..*` `Ingredient`s).
- **Dashed arrows** (`..>`) show which enumeration a field draws its value from.
- `GroupMember` and `Menu`/`MenuRequest` are association/junction-style classes:
  `GroupMember` links a `Profile` to a `Group` with a `role`, and a `MenuRequest`
  produces at most one `Menu`.

## Key relationships

- A **Profile** owns its private pantry **Ingredients**, can own and belong to
  **Groups** (membership via **GroupMember** with a **GroupRole**), and receives
  **Notifications**.
- A **Group** collects **MenuRequests**; a completed request yields a **Menu** of
  **Recipes**, each composed of **RecipeIngredients** that may be attributed back
  to the contributing **Profile**.
