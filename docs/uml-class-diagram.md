# UML Class Diagram

This document describes the **domain model** (persisted in PostgreSQL via Prisma) and the **application service layer** (implemented in `packages/backend/src/lib/`). Together they form the core object model of the Recipe Collaboration App.

For how these classes map to repository packages, folders, and request flow, see [monorepo-structure.md](./monorepo-structure.md).

## Domain Model (Database Entities)

The canonical schema is defined in `prisma/schema.prisma`. Prisma generates TypeScript types into `packages/backend/src/generated/prisma/`.

### Entity Relationship Diagram

```mermaid
erDiagram
  Profile ||--o{ Ingredient : owns
  Profile ||--o{ Group : "owns (GroupOwner)"
  Profile ||--o{ GroupMember : "has memberships"
  Profile ||--o{ MenuRequest : requests
  Profile ||--o{ RecipeIngredient : "contributes to"
  Profile ||--o{ Notification : "receives (recipient)"
  Profile ||--o{ Notification : "acts (actor)"

  Group ||--o{ GroupMember : has
  Group ||--o{ MenuRequest : has
  Group ||--o{ Menu : has
  Group ||--o{ Notification : "scoped to"

  MenuRequest ||--o| Menu : "produces"
  Menu ||--o{ Recipe : contains
  Recipe ||--o{ RecipeIngredient : "made from"
  Ingredient ||--o{ Notification : "triggers"

  Profile {
    uuid id PK
    string email UK
    string displayName
    string profilePictureUrl
    string[] allergies
    string[] medicalRestrictions
    string[] neverIncludeIngredientIds
    string[] diets
    string[] intolerances
    string[] preferredCuisines
    string[] excludedCuisines
    string[] dislikedIngredients
    string spiceLevel
    datetime createdAt
    datetime updatedAt
  }

  Ingredient {
    uuid id PK
    uuid ownerId FK
    string canonicalIngredientId
    string name
    decimal quantity
    string unit
    string notes
    datetime createdAt
    datetime updatedAt
  }

  Group {
    uuid id PK
    uuid ownerId FK
    string name
    string description
    string inviteCode UK
    int pantrySnapshotVersion
    int activeBundleVersion
    string selectedBundleId
    boolean allowMissingIngredients
    boolean staplesEnabled
    string[] customStaples
    datetime createdAt
    datetime updatedAt
  }

  GroupMember {
    uuid id PK
    uuid groupId FK
    uuid profileId FK
    GroupRole role
    datetime joinedAt
  }

  MenuRequest {
    uuid id PK
    uuid groupId FK
    uuid requestedById FK
    string prompt
    string cuisine
    int mealCount
    MenuRequestStatus status
    datetime createdAt
    datetime updatedAt
  }

  Menu {
    uuid id PK
    uuid groupId FK
    uuid requestId FK
    string title
    string summary
    datetime createdAt
    datetime updatedAt
  }

  Recipe {
    uuid id PK
    uuid menuId FK
    string title
    MealCategory category
    string instructions
    int servings
    datetime createdAt
    datetime updatedAt
  }

  RecipeIngredient {
    uuid id PK
    uuid recipeId FK
    uuid fromProfileId FK
    string name
    decimal quantity
    string unit
    string notes
  }

  Notification {
    uuid id PK
    uuid recipientId FK
    uuid actorId FK
    uuid groupId FK
    uuid ingredientId FK
    NotificationType type
    string title
    string message
    json metadata
    datetime readAt
    datetime createdAt
  }
```

### Enumerations

```mermaid
classDiagram
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
```

### Class Diagram (Domain Entities)

```mermaid
classDiagram
  direction TB

  class Profile {
    +UUID id
    +String email
    +String? displayName
    +String? profilePictureUrl
    +String? profilePictureStorageRef
    +String? profilePictureContentType
    +Int? profilePictureSizeBytes
    +String[] allergies
    +String[] medicalRestrictions
    +String[] neverIncludeIngredientIds
    +String[] diets
    +String[] intolerances
    +String[] preferredCuisines
    +String[] excludedCuisines
    +String[] dislikedIngredients
    +String? spiceLevel
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Ingredient[] ingredients
    +Group[] ownedGroups
    +GroupMember[] groupMemberships
    +MenuRequest[] menuRequests
    +RecipeIngredient[] contributedRecipeIngredients
    +Notification[] receivedNotifications
    +Notification[] actedNotifications
  }

  class Ingredient {
    +UUID id
    +UUID ownerId
    +String? canonicalIngredientId
    +String name
    +Decimal? quantity
    +String? unit
    +String? notes
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Profile owner
    +Notification[] notifications
  }

  class Group {
    +UUID id
    +UUID ownerId
    +String name
    +String? description
    +String? inviteCode
    +Int pantrySnapshotVersion
    +Int activeBundleVersion
    +String? selectedBundleId
    +Boolean allowMissingIngredients
    +Boolean staplesEnabled
    +String[] customStaples
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Profile owner
    +GroupMember[] members
    +MenuRequest[] menuRequests
    +Menu[] menus
    +Notification[] notifications
  }

  class GroupMember {
    +UUID id
    +UUID groupId
    +UUID profileId
    +GroupRole role
    +DateTime joinedAt
    --
    +Group group
    +Profile profile
  }

  class MenuRequest {
    +UUID id
    +UUID groupId
    +UUID requestedById
    +String? prompt
    +String? cuisine
    +Int? mealCount
    +MenuRequestStatus status
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Group group
    +Profile requestedBy
    +Menu? menu
  }

  class Menu {
    +UUID id
    +UUID groupId
    +UUID? requestId
    +String title
    +String? summary
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Group group
    +MenuRequest? request
    +Recipe[] recipes
  }

  class Recipe {
    +UUID id
    +UUID menuId
    +String title
    +MealCategory category
    +String? instructions
    +Int? servings
    +DateTime createdAt
    +DateTime updatedAt
    --
    +Menu menu
    +RecipeIngredient[] ingredients
  }

  class RecipeIngredient {
    +UUID id
    +UUID recipeId
    +UUID? fromProfileId
    +String name
    +Decimal? quantity
    +String? unit
    +String? notes
    --
    +Recipe recipe
    +Profile? fromProfile
  }

  class Notification {
    +UUID id
    +UUID recipientId
    +UUID? actorId
    +UUID? groupId
    +UUID? ingredientId
    +NotificationType type
    +String title
    +String message
    +Json? metadata
    +DateTime? readAt
    +DateTime createdAt
    --
    +Profile recipient
    +Profile? actor
    +Group? group
    +Ingredient? ingredient
  }

  Profile "1" --> "*" Ingredient : owns
  Profile "1" --> "*" Group : owns
  Profile "1" --> "*" GroupMember : member of
  Group "1" --> "*" GroupMember : has
  Group "1" --> "*" MenuRequest : has
  Profile "1" --> "*" MenuRequest : requests
  MenuRequest "0..1" --> "1" Menu : produces
  Group "1" --> "*" Menu : has
  Menu "1" --> "*" Recipe : contains
  Recipe "1" --> "*" RecipeIngredient : uses
  Profile "0..1" --> "*" RecipeIngredient : contributes
  Profile "1" --> "*" Notification : receives
  Profile "0..1" --> "*" Notification : acts
  Group "0..1" --> "*" Notification : scoped to
  Ingredient "0..1" --> "*" Notification : triggers
```

## Application Service Layer

Backend business logic is organized into service modules under `packages/backend/src/lib/`. API route handlers are thin and delegate to these services.

```mermaid
classDiagram
  direction TB

  class ApiRouteHandler {
    <<interface>>
    +GET(request) Response
    +POST(request) Response
    +PATCH(request) Response
    +DELETE(request) Response
  }

  class AuthService {
    +requestEmailOtp(input)
    +verifyEmailOtp(input)
    +requestMagicLink(input)
    +signInWithPassword(input)
    +signUpWithPassword(input)
    +refreshSession(input)
    +changePassword(input)
    +deleteAccount(userId)
  }

  class ProfileService {
    +findOrCreateProfileForEmail(email)
    +getProfileById(id)
    +updateProfile(id, input)
    +anonymizeProfileForAccountDeletion(id)
  }

  class ProfileConstraintsService {
    +getUserConstraints(userId)
    +replaceUserConstraints(userId, input)
    +patchUserConstraints(userId, input)
  }

  class IngredientService {
    +listIngredients(ownerId)
    +createIngredient(ownerId, input)
    +updateIngredient(ownerId, id, input)
    +deleteIngredient(ownerId, id)
  }

  class IngredientCatalogService {
    +searchCatalog(query)
    +findCatalogIngredientsByIds(ids)
  }

  class GroupMembershipService {
    +listUserGroups(profileId)
    +createUserGroup(profileId, input)
    +joinGroupByInviteCode(profileId, input)
    +listGroupMembers(groupId, profileId)
  }

  class GroupSettingsService {
    +getGroupSettings(groupId, profileId)
    +updateGroupSettings(groupId, profileId, input)
  }

  class GroupService {
    +getViewerContext(groupId, profileId)
    +listBundleCandidates(groupId, profileId)
    +selectBundleCandidate(groupId, profileId, input)
    +loadMoreBundleCandidates(groupId, profileId)
  }

  class BundleGenerationService {
    +generateInitialCandidates(groupId, request)
    +generateMoreCandidates(groupId, request)
    +getStoredCandidateSet(groupId)
  }

  class BundleOrchestrator {
    +generateBundleTemplates(request, context)
    +generateOneMoreBundleTemplate(request, context)
  }

  class ConstraintsLoader {
    +loadMemberConstraints(groupId)
    +aggregateMemberPreferences(constraints)
  }

  class BundleValidator {
    +buildValidatedCandidateSet(templates, pantry, settings)
  }

  class NotificationService {
    +listUserNotifications(profileId)
    +markNotificationsRead(profileId, ids)
  }

  class SupabaseAuth {
    +signInWithPassword(email, password)
    +signUpWithPassword(email, password)
    +requestEmailOtp(email)
    +verifyEmailOtp(email, otp)
    +refreshSession(refreshToken)
    +getUserFromAccessToken(token)
  }

  class SpoonacularClient {
    +searchRecipes(params)
    +getRecipesInformationBulk(ids)
    +searchIngredients(query)
    +getIngredientInformation(id)
  }

  class PrismaClient {
    +profile
    +ingredient
    +group
    +groupMember
    +menuRequest
    +menu
    +recipe
    +recipeIngredient
    +notification
  }

  ApiRouteHandler ..> AuthService
  ApiRouteHandler ..> ProfileService
  ApiRouteHandler ..> IngredientService
  ApiRouteHandler ..> GroupMembershipService
  ApiRouteHandler ..> GroupService
  ApiRouteHandler ..> NotificationService

  AuthService --> SupabaseAuth
  AuthService --> ProfileService
  ProfileService --> PrismaClient
  ProfileConstraintsService --> PrismaClient
  IngredientService --> PrismaClient
  GroupMembershipService --> PrismaClient
  NotificationService --> PrismaClient

  GroupService --> BundleValidator
  GroupService --> ConstraintsLoader
  BundleGenerationService --> BundleOrchestrator
  BundleGenerationService --> BundleValidator
  BundleGenerationService --> ConstraintsLoader
  BundleOrchestrator --> SpoonacularClient
  IngredientCatalogService --> SpoonacularClient
```

## Frontend Client Layer

The React frontend does not mirror the backend service classes directly. Instead, it exposes small API client modules that map to backend routes:

```mermaid
classDiagram
  direction LR

  class apiFetch {
    +apiFetch(path, init) Promise~JSON~
  }

  class authApi {
    +ensureAuthSession()
    +refreshAuthSession(token)
    +signIn(credentials)
    +signUp(credentials)
    +requestOtp(email)
  }

  class groupApi {
    +listGroups()
    +createGroup(input)
    +getGroup(id)
    +joinByInviteCode(code)
    +getBundleCandidates(groupId)
    +selectBundle(groupId, input)
  }

  class pantryApi {
    +listIngredients()
    +createIngredient(input)
    +updateIngredient(id, input)
    +deleteIngredient(id)
  }

  class constraintsApi {
    +getConstraints()
    +updateConstraints(input)
  }

  class notificationApi {
    +listNotifications()
    +markRead(ids)
  }

  class accountApi {
    +updateProfile(input)
    +changePassword(input)
    +deleteAccount()
  }

  authApi --> apiFetch
  groupApi --> apiFetch
  pantryApi --> apiFetch
  constraintsApi --> apiFetch
  notificationApi --> apiFetch
  accountApi --> apiFetch
```

## Key Relationships Summary

| From | To | Cardinality | Description |
|------|----|-------------|-------------|
| `Profile` | `Ingredient` | 1 : * | Each user owns a personal pantry |
| `Profile` | `Group` | 1 : * | A user can own multiple groups |
| `Profile` | `GroupMember` | 1 : * | A user can belong to multiple groups |
| `Group` | `GroupMember` | 1 : * | A group has many members with roles |
| `Group` | `MenuRequest` | 1 : * | Groups submit generation requests |
| `MenuRequest` | `Menu` | 1 : 0..1 | A completed request may produce one menu |
| `Menu` | `Recipe` | 1 : * | A menu contains multiple recipes |
| `Recipe` | `RecipeIngredient` | 1 : * | Recipes list required ingredients |
| `Profile` | `RecipeIngredient` | 1 : 0..* | Ingredients may be attributed to a contributor |
| `Profile` | `Notification` | 1 : * | Users receive in-app notifications |

## Notes

- **Generated code:** Prisma Client types and query methods are auto-generated; treat `prisma/schema.prisma` as the source of truth for the domain model.
- **In-memory stores:** Some generation and constraint logic (`demo-store`, `constraints/store`, `bundle-candidate-store`) uses in-memory state alongside Prisma persistence during active development of bundle features.
- **External types:** Spoonacular API responses are mapped into internal `BundleTemplate` shapes by `recipe-mapper.ts` before validation and presentation.

