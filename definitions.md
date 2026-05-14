# Collaborative Recipe App Definitions

This file defines application-specific terms used in the user stories. 

## Core Product Concepts

### Application
The collaborative recipe generation web app. The MVP is web-only and does not include a native mobile app.

### Group
A shared household or co-living space inside the app. A group represents people who may live together, keep separate groceries, and want to plan shared meals.

### Group Member
A user who belongs to a group. Members can manage their own pantry and profile, view the cumulative group pantry, view generated candidate bundles, and view the active bundle.

### Group Admin
A group member with elevated permissions. Admins can manage group settings, generate bundles, select the active bundle, edit or remove pantry items, and override soft preferences for a specific generation request.

### Multiple Admins
A group may have more than one admin. Because multiple admins can act at the same time, the app needs stale-result warnings and version checks to avoid conflicting selections or double-decrementing pantry quantities.

### Invite Code / Invite Link
A way for a user to join a group. The app generates an invite code or link when a group is created or when an admin invites members.

---

## Pantry and Ingredient Concepts

### Ingredient
A canonical food item from the app's ingredient database, such as onion, rice, chicken breast, butter, salt, or tomato. Ingredients should be structured so the system can support search, units, allergens, and validation.

### Canonical Ingredient Database
The structured ingredient source used by the app. Users should select ingredients from this database instead of typing fully freeform pantry entries whenever possible.

### Pantry
A user's collection of available ingredients. In MVP, the pantry is stored at the user profile level, not the group level.

### Pantry Item
A specific ingredient entry in a user's pantry. A pantry item includes an ingredient, quantity, unit, owner, and timestamps.

Example: `2 onions owned by Alex` or `1 lb chicken breast owned by Maya`.

### Profile-Level Pantry
The MVP pantry model where a user's pantry is attached to the user profile and is considered available across all groups that user belongs to.

### Cumulative Pantry
The combined view of all pantry items from members of a group. This is the default group pantry view.

### Owner Cue
A subtle visual indicator showing who owns or is contributing a pantry item. Examples include initials, avatar dots, hover details, or expandable contributor summaries.

### Owner Filter
A pantry view control that lets users filter the cumulative pantry by a specific member.

### Pantry Quantity
The amount of an ingredient available in a user's pantry, such as `3 onions`, `500 g pasta`, or `2 cups rice`.

### Automatic Pantry Decrement
The process of reducing available pantry quantities when an admin selects an active bundle. This keeps inventory closer to reality without requiring manual updates after selection.

### Inventory Reservation
A safer internal implementation model for automatic pantry decrementing. Instead of permanently subtracting quantities without context, the app records which pantry quantities are reserved or consumed by a selected bundle so changes can be released or adjusted if the active bundle changes.

### Allocation
The mapping between recipe ingredients and the specific pantry items that will supply them.

Example: a recipe needs `2 onions`; the allocation says `1 onion from Alex` and `1 onion from Maya`.

### Duplicate Ingredient Allocation
The rule for deciding whose pantry item gets used when multiple members have the same ingredient.

MVP recommendation: use staples first, then use the fewest contributors possible, split only when necessary, and use a deterministic tie-breaker when there are equal options.

### Deterministic Allocator
The system logic that assigns required recipe ingredients to pantry owners in a predictable way. It should produce the same allocation given the same pantry state and request.

### Staples
Basic pantry items that a group may choose to treat as available without tracking exact quantities. MVP default staples are oil, butter, salt, and pepper.

### Staples Preset
The default list of staples available to a group if the admin enables it. The MVP preset is intentionally small: oil, butter, salt, and pepper.

### Custom Staples List
A group-specific list of staples that admins can edit. When enabled, these staples are treated as effectively unlimited for generation and allocation in MVP.

### Missing Ingredient
An ingredient needed by a generated bundle that is not available in the cumulative pantry or enabled staples list.

### Missing Ingredients Allowed
A group setting controlled by admins. When enabled, generated bundles may include missing ingredients, but the app must clearly disclose them. When disabled, bundles with missing ingredients should be blocked or regenerated.

### Unsupported Unit Conversion
A case where the app cannot safely convert between units, such as converting cups to grams for an ingredient without a known density. The app should block, flag, or request manual resolution instead of silently decrementing incorrectly.

---

## Recipe Generation Concepts

### Course
A part of a meal. MVP course types are appetizer, main, side, and dessert.

### Course Type
The category of a course. MVP supports four course types: appetizer, main, side, and dessert.

### Course Toggle
A UI control that lets an admin turn specific course types on or off for a generation request.

### Course Count
The number of courses an admin wants in a generated meal bundle.

Example: if the admin selects appetizer, main, and dessert, the course count is 3.

### Recipe
A single dish with ingredients and instructions.

Example: `Garlic Butter Pasta` as a main course.

### Menu
A coordinated meal made up of multiple courses.

Example: appetizer + main + dessert.

### Bundle
A generated multi-course menu option. A bundle contains multiple recipes that are intended to work together as one shared meal plan.

Example: a bundle could include bruschetta as the appetizer, pasta primavera as the main, garlic bread as the side, and berry parfait as the dessert.

### Candidate Bundle
A generated bundle that has passed validation and is available for review. The initial generation request returns 3 candidate bundles.

### Active Bundle
The candidate bundle selected by an admin as the current group meal plan. Members can view it, and pantry quantities are decremented based on its allocation.

### Unselected Candidate Bundle
A candidate bundle that was generated and shown to the group but not chosen as the active bundle.

### Generate 1 More
An admin action that creates one additional candidate bundle without removing or resetting the current candidate list.

### Bundle Request
The input used to generate bundles. It includes selected course types, course count, servings, group settings, pantry data, hard constraints, soft preferences, and optional freeform instructions.

### Bundle Candidate Set
The group of candidate bundles returned from a generation request. The first request returns 3 bundles; additional requests can append 1 more bundle at a time.

### Bundle Card
A UI component that summarizes a candidate bundle. It should show the bundle title, course breakdown, missing ingredients, contributor mapping, override badges if applicable, and rationale.

### Bundle Rationale
The explanation for why a bundle was generated or selected. It may include pantry coverage, missing ingredient count, course fit, staples used, contributor mapping, and preference overrides.

### Pantry Coverage
How much of a bundle can be made from the available cumulative pantry and enabled staples.

### Contributor Mapping
The display of which member contributes which ingredients to a bundle.

### Progressive Reveal
A UX pattern where generated results or loading progress appear gradually instead of making users wait on a blank screen.

### Structured Output
A predictable response format from the LLM, such as JSON, that separates bundle title, courses, ingredients, instructions, rationale, and validation-relevant fields.

---

## User Preference and Constraint Concepts

### User Profile
A user's persistent app profile. It stores pantry items, hard constraints, and soft preferences.

### Hard Constraint
A safety-critical or non-negotiable dietary rule. Hard constraints cannot be overridden by admins.

Examples: allergies, medical restrictions, and never-include ingredients.

### Allergy
A hard constraint related to food safety. The system must block generated bundles that violate known allergies.

### Never-Include Ingredient
An ingredient that should never appear in generated bundles for a user. This should be treated as a hard constraint.

### Soft Preference
A taste-based preference that can guide generation but may be overridden by an admin for a specific request.

Examples: dislikes, cuisine leanings, spice preference, or avoiding a certain vegetable.

### Soft Preference Override
An admin decision to ignore a user's soft preference for a specific generation request. The app must disclose the override on the bundle card, in the bundle rationale, in the activity log, and through email notification to the affected member.

### Override Badge
A visible label on a candidate bundle card that indicates a soft preference was overridden.

### Override Reason
A short explanation provided by an admin when overriding a soft preference. This reason should be stored and shown in relevant disclosure surfaces.

### Request-Level Preference
A preference that applies only to the current generation request, such as cuisine direction, prep time, difficulty, equipment, servings, or freeform instructions.

### Rule-Based Validator
System logic outside the LLM that checks whether generated bundles satisfy hard constraints, group settings, pantry feasibility, unit sanity, and course completeness.

### Validation Failure
A case where a generated bundle does not pass required checks. Failed bundles should be blocked, regenerated, or flagged for correction before users see or select them.

---

## Authentication and Notification Concepts

### Clerk
The authentication provider selected for MVP.

### Email OTP
Email one-time password authentication. Users sign in by entering their email address, receiving a code, and verifying that code.

### Authenticated Session
A signed-in user session that persists across page refreshes.

### Email Notification
An email sent by the app to keep members informed. MVP notifications are email-only, not push or in-app notifications.

### Bundle Selection Email
An email sent to group members when an admin selects or changes the active bundle. It should include the group name, bundle title, course summary, and link to the active bundle.

### Soft Preference Override Email
An email sent to an affected member when an admin overrides one of their soft preferences. It should include the preference, reason if provided, group name, and link to the relevant bundle rationale.

### Pantry Update Notification
An email notification that may be sent when a bundle replacement changes pantry quantities for a member.

---

## Admin Concurrency Concepts

### Admin Concurrency
A situation where multiple admins are generating, reviewing, or selecting bundles around the same time.

### Pantry Snapshot Version
A version marker representing the pantry state at the time a candidate set was generated.

### Active-Bundle Version
A version marker representing the active bundle state at the time a candidate set was generated.

### Version Token
A value sent with selection requests so the backend can detect whether the candidate bundle is based on stale pantry or active-bundle data.

### Stale Candidate Set
A candidate set that was generated from an older pantry or active-bundle state. This can happen if another admin selects a bundle or changes relevant pantry data first.

### Stale-Result Warning
A warning shown when an admin tries to select from a stale candidate set. The app should require refresh, re-validation, or explicit confirmation depending on the final implementation.

### Optimistic Concurrency
A conflict-handling strategy where the app allows users to work freely but checks for conflicts before committing important changes.

### Double-Decrement
A bug where pantry quantities are reduced more than once for the same selection or because two admins select overlapping bundles at the same time. Version checks and reservation-aware selection are meant to prevent this.

---

## Activity and Audit Concepts

### Activity Log
A group-visible record of important actions such as bundle selection, admin pantry edits, and soft preference overrides.

### Activity Log Entry
One row or item in the activity log. It should include actor, timestamp, action type, before/after state where relevant, and reason when applicable.

### Actor
The user who performed an action, such as selecting a bundle or editing a pantry item.

### Before/After State
The stored record of what changed during an action.

Example: pantry item changed from `3 onions` to `1 onion` after active bundle selection.

---

## Roadmap Concepts

### MVP
The first usable release of the product. It focuses on web app delivery, email OTP auth, groups, cumulative pantry, multi-course bundle generation, candidate visibility, active bundle selection, automatic pantry decrementing, and email notifications.

### MVP+1
The next phase after MVP. Likely candidates include saved recipe history, shopping list generation, shopping list export, voting, and native mobile app exploration.

### MVP+2
A later phase that may include per-group pantry sharing controls, cost contribution, barcode scanning, OCR, meal planning, and manual admin override for ingredient allocation.

### Native Mobile App
A future iOS/Android app. It is explicitly out of scope for MVP.

### Push Notification
A mobile or browser push alert. Push notifications are not part of MVP and belong with later mobile or notification roadmap work.

### Shopping List Export
A future feature that turns missing ingredients into a shopping list and exports it to Apple Notes or another destination. It is not part of MVP.

### Per-Group Pantry Sharing
A future feature that lets users choose which pantry items are available to which group. In MVP, profile-level pantry items are available across all groups.

