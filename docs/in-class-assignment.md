# In-Class Assignment: CI Workflow

This branch is for the in-class assignment only. It should be pushed to GitHub as `in-class-assignment` and not merged into `main` until it has been reviewed.

1. Git status

   Started from the latest `origin/main` and created the branch `in-class-assignment`.

2. Create workflow folder

   Created `.github/workflows/`.

3. Create YAML workflow file

   Created `.github/workflows/ci-testing.yml`.

4. Commit, merge, and push to GitHub

   For this assignment branch, commit and push the branch to GitHub. Do not merge into `main` yet because this submission is meant to stay separate.

5. Bash commands used

   ```bash
   git status
   git checkout -b in-class-assignment origin/main
   git add .github/workflows/ci-testing.yml docs/in-class-assignment.md README.md
   git commit -m "Add in-class CI workflow assignment"
   git push origin in-class-assignment
   ```

6. Add a comment to a file and add/commit/push

   Added an in-class assignment comment to `README.md`, then included it in the same branch commit.

7. Check GitHub Actions build status

   Open the repository on GitHub, go to the Actions tab, and check the `CI Testing` workflow run for this branch.

8. Who will take care of the automated tests?

   Kartik.

9. Who will create the Microsoft Azure account and set up Azure Web App?

   Kartik.

10. What days will you be in the lab this week and next week?

    Wednesday both weeks.
