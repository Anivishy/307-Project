# Prisma Drift Agent Playbook

Use this when Prisma reports drift, unexpected server errors seem database-related, or a teammate's local Prisma schema/migration state does not match the shared development database.

This playbook is written for an agent. Follow it step by step, report the exact command outputs that matter, and do not run destructive commands unless the user explicitly approves them.

## Safety Rules

- Work from the repo root.
- Do not run `npx prisma migrate reset` unless the user explicitly confirms that dropping all data in the target database is acceptable.
- Do not edit or delete existing migrations casually. If a migration was already applied to a shared database, preserve history and add a new migration instead.
- Treat Supabase/shared development databases as shared state. Prefer restoring missing local migration files over resetting the database.
- Commit both `prisma/schema.prisma` and any matching `prisma/migrations/.../migration.sql` files together.

## 1. Confirm Prisma Runs Locally

Run:

```bash
npx prisma --version
npx prisma validate
```

Interpretation:

- If `prisma validate` fails, fix `prisma/schema.prisma` first. Migration checks are not meaningful until the schema is valid.
- If the command says the package cannot be found, verify the user typed `prisma`, not `primsa`, and run `npm install` if dependencies are missing.

## 2. Check Migration Status Against the Configured Database

Run:

```bash
npx prisma migrate status
```

Interpretation:

- `Database schema is up to date!` means the local migrations and configured database agree.
- `Following migration have not yet been applied` means local migration files exist but the database has not applied them yet.
- `Migrations applied to the database but absent from the migrations directory` means the database recorded a migration that this checkout does not have. This is a common drift cause after branch switches or incomplete merges.
- `Drift detected` means Prisma compared the expected schema from migrations with the real database and found differences.

## 3. Test Local Schema vs Local Migration History

This checks whether `schema.prisma` has changes that are not represented by local migration files.

Run:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --exit-code
```

Interpretation:

- Exit code `0`: local migrations and local schema describe the same database shape.
- Exit code `2`: there is a diff. The local schema and local migrations are out of sync.
- Exit code `1`: the command failed. Read the error; common causes are invalid schema or database connection/shadow database problems.

To see the actual local diff, run the same command without `--exit-code`:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma
```

## 4. Test Local Migration History vs the Development Database

This checks whether the configured database has extra objects, missing objects, or migration history that does not match the local folder.

Run:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-config-datasource \
  --exit-code
```

Interpretation:

- Exit code `0`: the database shape matches what local migrations produce.
- Exit code `2`: local migrations and the database differ. Run without `--exit-code` to inspect the diff.
- If the diff shows tables/enums/indexes added in the database, check whether a migration file is missing locally.

To inspect the diff:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-config-datasource
```

## 5. Choose the Fix Based on the Failure

### Case A: Only Pending Local Migrations

Symptom:

```text
Following migration have not yet been applied:
...
```

Fix for development:

```bash
npx prisma migrate dev
npx prisma generate
```

Fix for deployment-style environments:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Case B: Local Schema Changed But No Migration Exists

Symptom:

- Step 3 returns exit code `2`.
- The diff shows changes from `prisma/migrations` to `prisma/schema.prisma`.

Fix:

```bash
npx prisma migrate dev --name describe_the_change
npx prisma generate
```

Then inspect the generated SQL:

```bash
find prisma/migrations -maxdepth 2 -type f -name migration.sql -print
```

Commit:

- `prisma/schema.prisma`
- the new `prisma/migrations/<timestamp>_describe_the_change/migration.sql`
- generated Prisma client files only if this repo intentionally tracks them

### Case C: Database Has an Applied Migration Missing Locally

Symptom:

```text
Migrations applied to the database but absent from the migrations directory are:
...
```

Fix:

1. Search git history for the missing migration:

```bash
git log --all --oneline -- prisma/migrations/<missing_migration_name>
```

2. If found, restore the exact missing migration file from the commit:

```bash
git show <commit>:prisma/migrations/<missing_migration_name>/migration.sql
```

3. Recreate `prisma/migrations/<missing_migration_name>/migration.sql` with the exact SQL from history.

4. Check whether `prisma/schema.prisma` also lost the matching model/enum/field changes. If it did, restore those schema changes without removing newer unrelated schema fields.

5. Re-run:

```bash
npx prisma validate
npx prisma migrate status
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-config-datasource \
  --exit-code
```

If git history does not contain the migration, ask a teammate for the missing migration file before considering any reset.

### Case D: Database Was Manually Changed Outside Prisma

Symptom:

- Step 4 shows tables, columns, indexes, or enums in the database that do not correspond to any migration.
- `migrate status` may not list a missing migration, but `migrate diff` shows real schema differences.

Preferred fix:

1. Decide whether the manual database change should be kept.
2. If it should be kept, update `schema.prisma` to represent the database state.
3. Create a migration that captures the change for everyone else:

```bash
npx prisma migrate dev --name capture_manual_db_change
npx prisma generate
```

If the manual change should not be kept, create a new migration that reverses it. Do not hand-edit old applied migrations.

### Case E: The Local Branch Is Missing Teammate Work

Symptom:

- Missing migration exists on `main` or another teammate branch.
- The local branch was stale or had a merge conflict that dropped files.

Fix:

```bash
git fetch
git log --all --oneline -- prisma/migrations
```

Then merge/rebase/cherry-pick the commit that contains the missing migration, or manually restore the missing migration and schema changes if the branch structure is messy.

## 6. Last Resort: Reset Only a Disposable Development Database

Use this only when:

- The user confirms all data in the configured database can be dropped.
- The database is local or disposable.
- Restoring missing migration files is not possible.

Command:

```bash
npx prisma migrate reset
npx prisma generate
```

Before running it, repeat the target database hostname from Prisma output and ask the user to confirm. Never reset a shared Supabase database without explicit approval.

## 7. Final Verification

Run:

```bash
npx prisma validate
npx prisma migrate status
npx prisma generate
```

Success criteria:

- `prisma validate` says the schema is valid.
- `prisma migrate status` says the database schema is up to date.
- `prisma generate` completes and writes the Prisma Client successfully.

Then summarize:

- What drift was found.
- Which files were restored or created.
- Which migrations were applied.
- Whether any data-destructive command was avoided or used.
