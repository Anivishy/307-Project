This guide will get your local environment synced with our shared Supabase backend. Follow these steps in order.

---

## 1. Create a Supabase Account
Before starting, you need an account to authorize the CLI.
1. Go to [supabase.com](https://supabase.com) and click **Sign Up**.
2. **Crucial:** Use the same email address that was invited to the project.
3. Accept the invitation sent to your email by the project owner.

## 2. Install the Supabase CLI
You need the CLI to sync the database schema and manage migrations.

**Mac (Homebrew):**
```bash
brew install supabase/tap/supabase

```
* you can also use npm on mac

**Windows / Linux (NPM):**

```bash
npm install -g supabase

```

> **Note:** Verify the installation by running `supabase --version`.

## 3. Link Your Local Repo

Run these commands inside the root of our Git repository.

### Step A: Login

This will open a browser window to authenticate your machine.

```bash
supabase login

```

### Step B: Link to Project

Replace `[PROJECT_ID]` with the ID found in our group chat.

```bash
supabase link --project-ref [PROJECT_ID]

```

*You will be prompted for the **Database Password**, it's in the group chat.*

---

## ⚡ Supabase 101: Team Workflow

To keep our database in sync without breaking each other's code, follow these rules:

### 1. Don't touch the Dashboard UI for Schema Changes

Avoid creating tables or columns directly in the Supabase browser dashboard. If you do, those changes only exist in the cloud and won't be in our Git history.

### 2. Use Migrations

If you need to change the database (add a table, rename a column):

1. **Pull the current state:** `supabase db pull`
2. This creates a new file in `supabase/migrations/`.
3. Commit this file to Git so we all get the update when we `git pull`.

### 3. Local Development (Optional)

If you have Docker installed, you can run a local version of Supabase to test things without affecting the "production" database:

```bash
supabase start

```

### 4. Generating Types (TypeScript)

Since we are using TypeScript, run this to get auto-complete for our database schema:

```bash
supabase gen types typescript --local > types/supabase.ts

```

---

##  Troubleshooting

* **`command not found: supabase`**: Restart your terminal or check your `$PATH`.
* **Permission Denied**: Ensure you accepted the email invite to the Supabase Organization.
* **Database Password**: If you get an 'incorrect password' error during `link`, the project owner needs to reset it in Settings > Database.
