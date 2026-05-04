Recipe Collaborator

SOFTWARE REQUIREMENTS SPECIFICATION
INSTRUCTOR: LARA NICHOLS-BROWN
TERM: Spring 2026
SECTION: 09

THE ENGINEERING TEAM:
1.	STUDENT A: Vinayak — Product Owner
2.	STUDENT B: Anikait — Scrum Master
3.	STUDENT C: Kartik — Tester
4.	STUDENT D: Leon - Lead Developer

PROJECT ASSETS:
- GITHUB: https://github.com/Anivishy/307-Project
- DEPLOYMENT: TBD

DOCUMENT HISTORY: 	
LAST DATE CHANGED: 5/03/26 	WHO: Vinayak	WHAT WAS CHANGED: Problem statement, user stories, functional requirements.
________________________________________ 

Recipe OS
SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
COURSE: CSC-307
DATE: TBD
________________________________________
TABLE OF CONTENTS
1.	INTRODUCTION ...................................................................................... [PAGE #]
O	1.1 PROJECT PURPOSE
O	1.2 INTENDED AUDIENCE
O	1.3 PROJECT SCOPE
2.	USER STOREIES ..................................................................................... [PAGE #]
O	2.1 USER FEATURES (THE "SHALL" STATEMENTS)
O	2.2 ADMIN FEATURES
3.	FUNCTIONAL REQUIREMENTS....................................................... [PAGE #]
4.	NON-FUNCTIONAL REQUIREMENTS ............................................ [PAGE #]
O	4.1 DATA INTEGRITY & SECURITY
O	4.2 PERFORMANCE & USABILITY
5.	SYSTEM ARCHITECTURE ................................................................ [PAGE #]
O	5.1 REST API ENDPOINTS
O	5.2 DATABASE SCHEMA (MYSQL)
6.	USER INTERFACE (UI) ...................................................................... [PAGE #]
O	6.1 WIREFRAMES / MOCKUPS
7.	DATA REQUIREMENTS ..................................................................... [PAGE #]
O	7.1 LIST OF PERSISTENT DATA
8.	TRACEABILITY MATRIX ................................................................. [PAGE #]
9.	APPENDICES ....................................................................................... [PAGE #]
________________________________________

 
1.	INTRODUCTION
-	PROBLEM STATEMENT: Roomates or co-living households often struggle to manage individual meals with sharing or cooking together. Planning a family dinner or meals for the week can be hard if there is overlap for ingredients used in personal meals and groups meals. Recipe OS makes this process simpler and allows flexibility for groups to generate recipes based on what individuals have now and what they are willing to share, allowing roomate connections to flourish over meals, while allowing individuals the flexibility to cook on their own schedule and preferences when desired.
-	TARGET AUDIENCE: Roomates and co-living households
-	SCOPE: A web-app that allows roomates to collaboratively generate meal bundles with recipes.

2.	USER STORIES
USER STORIES FOLLOW THE FORMAT: "AS A [TYPE OF USER], I WANT TO [ACTION] SO THAT [VALUE/BENEFIT]."...
- US1 — Sign in with email OTP
- US2 — Create or join a group
- US3 — Add pantry items from ingredient database
- US4 — View cumulative pantry with owner cues
- US5 — Store hard dietary constraints in profile
- US6 — Store soft preference defaults in profile
- US7 — Toggle missing ingredients allowed
- US8 — Manage staples list
- US9 — Generate coordinated multi-course bundle
- US10 — View all candidate bundles
- US11 — Generate one more bundle
- US12 — Automatic pantry decrement + activity log
- US13 — Email notifications
- US14 — Admin concurrency

US-1 As a new user, I want to sign in with a one-time-password sent via email so that my pantry and preferences persist across sessions.

US-2 As a user, I want to create or join a group so that I can collaborate with housemates.

US-3 As a user, I want to add pantry items from an ingredient database so that meal generation uses data from a preloaded list of ingredients.

US-4 As a member, I want to view the group pantry with individual ingredient owner cues so that I can understand what the household can cook and who owns what.

US-5 As a user, I want to store allergies and hard dietary restrictions in my profile so that generated meal bundles violating these hard restrictions are blocked automatically.

US-6 As a user, I want to store soft defaults such as dislikes and cuisine preferences so that generation starts from my base preferences.

US-7 As an admin, I want to toggle whether missing ingredients are allowed so that generation matches the group's preferences for shopping for unavailable ingredients.

US-8 As an admin, I want to manage a customizable list of pantry staples so that recipe generation can assume common basics such as salt, pepper, oil etc. only when the household approves.

US-9 As an admin, I want to generate multiple course meal bundles with a selectable number of courses so that I can plan a full shared meal.

US-10 As a member in a group, I want to view unselected potential meal bundles so that the group has transparency into what was considered for selection.

US-11 As an admin, I want to generate one more meal bundle at a time with feedback so that I can explore more options without restarting the entire request.

US-12 As an admin, I want available pantry quantities to decrement automatically when I confirm a meal bundle so that inventory stays closer to reality for future recipe generation.

US-13 As a member, I want to receive an email notification when an admin selects a meal bundle or overrides one of my soft preferences so that collaboration stays transparent.

US-14 As an admin, I want to be warned about previously generated potential meal sets before I select so that I do not accidentally overwrite another admin's selection or double-decrement pantry quantities.

3.	FUNCTIONAL REQUIREMENTS

FR1.1 The system shall allow a user to request an email OTP from a sign-in screen.

FR1.2 The system shall allow the user to enter and verify the OTP.

FR1.3 The system shall create an authenticated session after successful OTP verification.

FR1.4 The authenticated session shall persist across browser refreshes.

FR1.5 After sign-in, the system shall redirect the user to the most relevant group context when available.

FR1.6 If the user does not yet belong to a group, the system shall redirect the user to the create-or-join group flow.

FR1.7 The system shall allow authenticated users to sign out.

FR1.8 The authentication flow shall be covered by integration tests.
⸻

FR2.1 The system shall allow an authenticated user to create a group.

FR2.2 The creator of a group shall automatically receive the Admin role.

FR2.3 The system shall generate an invite code or invite link when a group is created.

FR2.4 The system shall allow a user to join a group using a valid invite code or link.

FR2.5 A user who joins through an invite shall receive the Member role by default.

FR2.6 The system shall store group membership records containing user, group, and role.

FR2.7 The system shall prevent duplicate memberships for the same user and group.

FR2.8 The system shall enforce group role permissions in both the API and UI.

FR2.9 Group creation, joining, and duplicate-join prevention shall be covered by tests.
⸻

FR3.1 The system shall provide typeahead search against a canonical ingredient database.

FR3.2 The system shall allow a user to add a pantry item from the ingredient database.

FR3.3 A pantry item shall include ingredient, quantity, unit, owner, timestamps, and validation metadata.

FR3.4 The system shall allow users to edit their own pantry items.

FR3.5 The system shall allow users to remove their own pantry items.

FR3.6 The system shall validate required pantry fields before saving.

FR3.7 The system shall support the agreed MVP unit strategy for pantry quantities.

FR3.8 The system shall support a fallback behavior if an ingredient is not found, if included in the release slice.

FR3.9 Pantry create, read, update, and delete behavior shall be covered by tests.
⸻

FR4.1 The system shall provide a group pantry view that combines pantry items from all group members.

FR4.2 The cumulative pantry shall be the default group pantry view.

FR4.3 The default pantry view shall not be segmented by owner.

FR4.4 Each pantry item in the cumulative view shall include owner metadata.

FR4.5 The UI shall display subtle ownership cues, such as initials, avatar dots, hover details, or expandable contributor summaries.

FR4.6 The system shall allow members to filter the group pantry by owner.

FR4.7 The group pantry endpoint shall return merged pantry data with owner metadata.

FR4.8 The cumulative pantry view shall be available to all group members.

FR4.9 Cumulative display, ownership cues, and filtering shall be covered by tests.

FR5.1 The system shall allow users to save hard dietary constraints in their profile.

FR5.2 Hard constraints shall include allergies, medical restrictions, and never-include ingredients.

FR5.3 The system shall allow users to update saved hard constraints.

FR5.4 The system shall automatically include hard constraints in bundle generation requests.

FR5.5 The system shall validate generated candidates against hard constraints outside the LLM.

FR5.6 The system shall block candidate bundles that violate hard constraints before they are displayed.

FR5.7 Hard constraints shall not be overridable by admins.

FR5.8 The validator shall produce a failure reason when a candidate is blocked.

FR5.9 Constraint saving and validator-blocking behavior shall be covered by tests.

FR6.1 The system shall allow users to save soft preference defaults in their profile.

FR6.2 Soft preferences shall include disliked ingredients, cuisine leanings, spice preferences, and other taste-based preferences.

FR6.3 The system shall allow users to update saved soft preferences.

FR6.4 The system shall automatically apply soft defaults to generation requests.

FR6.5 The system shall allow admins to override soft preferences for a specific generation request.

FR6.6 The system shall require an admin-provided reason when overriding a soft preference.

FR6.7 The system shall display an override badge on candidate bundle cards when a soft preference has been overridden.

FR6.8 The system shall display override details in the bundle rationale view.

FR6.9 Soft preference application and override visibility shall be covered by tests.

⸻

FR7.1 The system shall store an allowMissingIngredients setting for each group.

FR7.2 The system shall allow admins to enable or disable missing ingredients from group settings.

FR7.3 The system shall prevent non-admin members from changing the missing-ingredients setting.

FR7.4 Bundle validation shall respect the group’s missing-ingredients setting.

FR7.5 When missing ingredients are disabled, candidates requiring missing ingredients shall be blocked.

FR7.6 When missing ingredients are enabled, candidates may include missing ingredients.

FR7.7 Missing ingredients shall be clearly flagged on candidate bundle cards.

FR7.8 Missing ingredients shall not be decremented from pantry inventory.

FR7.9 Setting behavior and missing-ingredient disclosures shall be covered by tests.

⸻

FR8.1 The system shall provide a default staples preset containing cooking oil, butter, salt, and pepper.

FR8.2 The group model shall store whether staples are enabled.

FR8.3 The group model shall store a customizable staples list.

FR8.4 The system shall allow admins to toggle staples on or off.

FR8.5 The system shall allow admins to customize the group staples list.

FR8.6 The system shall prevent non-admin members from modifying staples settings.

FR8.7 When staples are enabled, the allocator shall treat enabled staples as effectively unlimited.

FR8.8 The allocator shall consume enabled staples before non-staple pantry items.

FR8.9 Staples usage shall be surfaced in bundle rationale.

FR8.10 Default preset, toggle behavior, customization, and allocation behavior shall be covered by tests.

⸻

FR9.1 The system shall allow admins to open a bundle generation form.

FR9.2 The system shall allow admins to select the number of courses.

FR9.3 The system shall allow admins to select active course types from appetizer, main, side, and dessert.

FR9.4 The system shall allow admins to set servings for the bundle request.

FR9.5 The system shall allow admins to provide optional cuisine direction, prep-time target, difficulty, equipment notes, and freeform instructions.

FR9.6 The system shall generate a coordinated multi-course menu bundle in a single request.

FR9.7 The initial generation request shall return three candidate bundles.

FR9.8 Each candidate shall include bundle title, course breakdown, recipe titles, servings, prep and cook times, ingredient lists, instructions, mapped ownership, missing ingredients where applicable, and rationale.

FR9.9 The system shall apply group hard constraints, soft defaults, missing-ingredient settings, and staples settings to the generation request.

FR9.10 The system shall validate candidates for course completeness, pantry feasibility, unit sanity, hard-constraint compliance, and group-setting compliance.

FR9.11 The system shall use a deterministic ingredient allocator.

FR9.12 The allocator shall consume enabled staples first.

FR9.13 For non-staples, the allocator shall minimize the number of contributors.

FR9.14 The allocator shall split ingredient sourcing only when necessary.

FR9.15 The allocator shall use deterministic tie-breakers when multiple owners can satisfy the same ingredient.

FR9.16 The generation flow shall support streaming or progressive reveal where feasible.

FR9.17 Generation integration tests shall cover candidate count, allocator behavior, and constraint enforcement.

⸻

FR10.1 The system shall allow all group members to view generated candidate bundles.

FR10.2 Members shall be able to view both selected and unselected candidate bundles.

FR10.3 The candidate list shall clearly identify the Active Bundle.

FR10.4 The candidate list shall clearly distinguish Other Candidates from the Active Bundle.

FR10.5 The system shall allow only admins to select an active bundle.

FR10.6 The UI shall hide or disable selection controls for non-admin members.

FR10.7 The API shall reject select-bundle requests from non-admin members.

FR10.8 Tests shall confirm that members can view all candidates but cannot select a bundle.

⸻

FR11.1 The system shall show a Generate 1 More control after the initial candidate set is generated.

FR11.2 The Generate 1 More control shall be available only to admins.

FR11.3 The system shall generate one additional validated bundle per request.

FR11.4 The additional bundle shall append to the existing candidate list.

FR11.5 The system shall preserve existing candidate bundles when a new bundle is appended.

FR11.6 The system shall not require a full reset of the original generation request to generate one more bundle.

FR11.7 The appended bundle shall include the same required data fields as the original candidates.

FR11.8 Append behavior shall be covered by tests.

⸻

FR12.1 The system shall allow only admins to select an active bundle.

FR12.2 The select-bundle endpoint shall apply the selected bundle and return a version token.

FR12.3 The system shall create inventory reservations when a bundle is selected.

FR12.4 Inventory changes shall use a reservation-aware decrement model rather than destructive subtraction only.

FR12.5 The system shall decrement visible available quantities according to the bundle’s allocation map.

FR12.6 Quantity changes shall propagate across every group the pantry owner belongs to.

FR12.7 Missing ingredients shall be skipped during decrementing.

FR12.8 Unsupported unit conversions shall block selection or require manual resolution.

FR12.9 The system shall show affected pantry items with a “last updated by bundle selection” label and timestamp.

FR12.10 The system shall release prior reservations when an active bundle is replaced.

FR12.11 The system shall apply new reservations atomically when a replacement bundle is selected.

FR12.12 The system shall record bundle selection events in the activity log.

FR12.13 The system shall record admin pantry edit events in the activity log.

FR12.14 The system shall record soft-preference override events in the activity log.

FR12.15 Activity log entries shall include actor, timestamp, action type, before/after state where relevant, and reason where appropriate.

FR12.16 The activity log shall be visible to all group members.

FR12.17 Tests shall cover decrementing, reservations, cross-group propagation, missing-item skipping, unsupported unit handling, and log entries.

⸻

FR13.1 The system shall integrate with a transactional email provider.

FR13.2 The system shall send a bundle-selection email when an admin selects an active bundle.

FR13.3 Bundle-selection emails shall be sent to all group members.

FR13.4 Bundle-selection emails shall include group name, bundle title, course summary, and a direct link to the active bundle view.

FR13.5 The system shall send a soft-preference override email when an admin overrides a member’s soft preference.

FR13.6 Override emails shall be sent only to affected members.

FR13.7 Override emails shall include group name, overridden preference, admin-provided reason, and a link to the relevant bundle rationale.

FR13.8 The system shall send a pantry-update email when bundle replacement causes affected pantry quantities to fluctuate.

FR13.9 Email triggers shall be tied to selection, override, and quantity-fluctuation events.

FR13.10 Email templates shall be covered by tests.

FR13.11 Recipient selection and event-trigger behavior shall be covered by tests.

⸻

FR14.1 The system shall stamp each candidate set with the pantry snapshot version used during generation.

FR14.2 The system shall stamp each candidate set with the active-bundle version used during generation.

FR14.3 The select-bundle endpoint shall compare the candidate set version token against current pantry and active-bundle versions.

FR14.4 The select-bundle endpoint shall reject stale selections by default.

FR14.5 The UI shall warn admins when a candidate set is stale.

FR14.6 The stale-result warning shall explain that another admin may have changed the active bundle or pantry state.

FR14.7 The stale-result flow shall offer refresh, re-validation, or explicit confirmation depending on final product policy.

FR14.8 Bundle replacement shall release prior reservations and apply new reservations atomically.

FR14.9 The system shall prevent double-decrementing when two admins attempt selection concurrently.

FR14.10 Concurrency tests shall confirm that simultaneous admin selections do not double-decrement inventory.

FR14.11 Concurrency tests shall confirm that stale-result warnings fire when expected.

5. NON-FUNCTIONAL REQUIREMENTS
-	INTEGRITY: The system shall validate user input and handle errors without crashing.
-	SECURITY: Passwords shall be hashed using bcrypt, and sensitive data stored in environment variables.
-	USABILITY: The interface shall be simple and easy to navigate across profile, groups, and menu pages.
-	PERFORMANCE: The system shall respond quickly, including menu generation within a reasonable time.
-	RELIABILITY: The system shall operate consistently without data loss or frequent failures.
-	SCALABILITY: The system shall support increasing users and groups over time.

5. SYSTEM ARCHITECTURE
-	REST ENDPOINTS: (LIST METHOD | URL | DESCRIPTION)
-	LIST YOUR PLANNED ENDPOINTS BASED ON YOUR REST SLIDE:
O	GET /API/RESOURCES — FETCHES COLLECTION.
O	POST /API/RESOURCES — CREATES A NEW RESOURCE.
-	UML: (ATTACH A DIAGRAM) 


6.	USER INTERFACE (UI) 
A.	5.1 WIREFRAMES / MOCKUPS
7.	DATA REQUIREMENTS

8.	TRACEABILITY MATRIX 

ID	REQUIREMENT	LINE OF CODE

9.	AI USAGE & DISCLOSURE (MANDATORY)
-	MODEL(S) USED: [E.G., CLAUDE 3.5, GPT-4O]
-	PROMPTS USED DURING CODING: 



