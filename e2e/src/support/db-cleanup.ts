import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_DB_CONTAINER = "allinone-db-1";
const DEFAULT_DB_USER = "postgres";
const DEFAULT_DB_NAME = "postgres";
const DEFAULT_E2E_USER_PREFIX = "e2e-";

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function cleanupSql(prefix: string): string {
  const likePrefix = `${prefix}%`;

  return `
BEGIN;
CREATE TEMP TABLE e2e_target_users ON COMMIT DROP AS
  SELECT id
  FROM anclax.users
  WHERE name LIKE ${sqlLiteral(likePrefix)};

CREATE TEMP TABLE e2e_target_orgs ON COMMIT DROP AS
  SELECT DISTINCT org_id AS id
  FROM anclax.user_default_orgs
  WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM public.memo_relations
WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM public.memo_tags
WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM public.memos
WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM public.users
WHERE id IN (SELECT id FROM e2e_target_users);

DELETE FROM anclax.opaque_keys
WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM anclax.org_users
WHERE user_id IN (SELECT id FROM e2e_target_users)
   OR org_id IN (SELECT id FROM e2e_target_orgs);

DELETE FROM anclax.org_owners
WHERE user_id IN (SELECT id FROM e2e_target_users)
   OR org_id IN (SELECT id FROM e2e_target_orgs);

DELETE FROM anclax.user_default_orgs
WHERE user_id IN (SELECT id FROM e2e_target_users);

DELETE FROM anclax.roles
WHERE org_id IN (SELECT id FROM e2e_target_orgs);

DELETE FROM anclax.orgs
WHERE id IN (SELECT id FROM e2e_target_orgs);

DELETE FROM anclax.users
WHERE id IN (SELECT id FROM e2e_target_users);
COMMIT;
`;
}

function countSql(prefix: string): string {
  const likePrefix = `${prefix}%`;

  return `
select
  (select count(*) from anclax.users where name like ${sqlLiteral(likePrefix)}) as e2e_auth_users,
  (select count(*) from public.users where id in (select id from anclax.users where name like ${sqlLiteral(likePrefix)})) as e2e_public_users,
  (select count(*) from public.memos where user_id in (select id from anclax.users where name like ${sqlLiteral(likePrefix)})) as e2e_memos,
  (select count(*) from public.memo_tags where user_id in (select id from anclax.users where name like ${sqlLiteral(likePrefix)})) as e2e_memo_tags,
  (select count(*) from anclax.orgs where id in (
    select org_id from anclax.user_default_orgs ud
    join anclax.users u on u.id = ud.user_id
    where u.name like ${sqlLiteral(likePrefix)}
  )) as e2e_orgs;
`;
}

async function runPsql(sql: string): Promise<string> {
  const dbContainer = process.env.E2E_DB_CONTAINER ?? DEFAULT_DB_CONTAINER;
  const dbUser = process.env.E2E_DB_USER ?? DEFAULT_DB_USER;
  const dbName = process.env.E2E_DB_NAME ?? DEFAULT_DB_NAME;

  const { stdout } = await execFileAsync("docker", [
    "exec",
    dbContainer,
    "psql",
    "-P",
    "pager=off",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    dbUser,
    "-d",
    dbName,
    "-c",
    sql,
  ]);

  return stdout.trim();
}

export async function cleanupE2EUsers(): Promise<void> {
  const prefix = process.env.E2E_USER_PREFIX ?? DEFAULT_E2E_USER_PREFIX;
  await runPsql(cleanupSql(prefix));
}

export async function describeE2EData(): Promise<string> {
  const prefix = process.env.E2E_USER_PREFIX ?? DEFAULT_E2E_USER_PREFIX;
  return runPsql(countSql(prefix));
}
