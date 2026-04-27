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
LAST DATE CHANGED: 4/27/26 	WHO: Anikait	WHAT WAS CHANGED: Filling out initial information about the project
		
		
		
		

________________________________________ 

Recipe Collaborator
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
-	PROBLEM STATEMENT: Cookouts or potlucks with friends and family can be an awesome experience. Unfortunatley, the process of coordinating this is painful, from figuring out what everyone has available to cook with, to planning a menu that is cohesive and will make for a good meal. This is the exact problem that we are trying to solve. We aim to build AI integrated software that brings groups of people together, collects what ingredients they need to work with, and creates a complete menu based on what the people in the group have available to them.
-	TARGET AUDIENCE: The target audience is 
-	SCOPE: WHAT IS THE SCOPE OF THIS PROJECT?

2.	USER STORIES
USER STORIES FOLLOW THE FORMAT: "AS A [TYPE OF USER], I WANT TO [ACTION] SO THAT [VALUE/BENEFIT]."...
-	US-01: Landing Page and User Sign In
-	US-02: User Profile View 
-	US-03: User Groups View
-	US-04: Individual group view pages
ID	REQUIREMENT	PRIORITY
US-01	As a user I can visit the home page and see an explanation of what the site does. I also have a clear sign up flow, where I can create an account if I do not have one using an email and setting my password. I can see a clear sign in flow if I already have an account, this will allow me to access my account information.
US-02	As a user I have now signed into a website am greeted with my profile view. I can see that what ingredients I have. I add new ingredients, edit the quantity, and remove ingredients from the list.
US-03	Now that I have updated the ingredients that I have available as well as their quantities, I want be able to navigate to a "groups" tab where I can see a collection of groups that I am in represented as cards. Clicking on one of these cards will take me to that groups page.
US-04	As a user now that I have selected a specific group, I am now navigated to a specific group page. Here I can see all the users in my group, represented as cards with all their recipies. I also have a textbox to enter any specifications that I have, like cuisine, how many meals (mains vs sides), etc.

3.	FUNCTIONAL REQUIREMENTS
THE SYSTEM SHALL...

- FR-01: Authenticate users with email and password. (Priority: 1)
- FR-02: Allow users to create, edit, and delete ingredients in their profile. (Priority: 1)
- FR-03: Allow users to create and join groups. (Priority: 1)
- FR-04: Display group members and their available ingredients. (Priority: 2)
- FR-05: Allow users to input preferences (e.g., cuisine, meal types). (Priority: 2)
- FR-06: Generate a complete menu based on group ingredients and preferences using AI. (Priority: 1)
- FR-07: Allow users to view generated recipes and meal plans. (Priority: 2)

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
US-01	The system will authenticate users via username and password.	152
US-02	Allow users to store workout information	256
US-03	Allow users to search their workout history	46
US-04	Allow users to add new workout types.	45

9.	AI USAGE & DISCLOSURE (MANDATORY)
-	MODEL(S) USED: [E.G., CLAUDE 3.5, GPT-4O]
-	PROMPTS USED DURING CODING: 



