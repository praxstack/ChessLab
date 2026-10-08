// Deletes one address from the waitlist.
//
//   npm run delete-signup               asks for the address, then deletes it from the live database
//   npm run delete-signup -- --local    the same, on the local development database
//
// The address is read at a prompt and handed to Wrangler as a single argument,
// never through a shell, because a valid address can contain characters a shell
// would run (backticks, $, braces).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { normalizeEmail } from '../src/lib/validate.js';

const DATABASE = 'askthemove-waitlist';

/** The SQL that deletes one address, stored lower case, with its quotes escaped for SQLite. */
export function deleteSql(address) {
  const email = normalizeEmail(address);
  if (!email || !email.includes('@') || /[\u0000-\u001f\u007f]/.test(email)) {
    throw new Error('That is not an email address.');
  }
  return `DELETE FROM waitlist WHERE email = '${email.replaceAll("'", "''")}'`;
}

async function main() {
  const local = process.argv.includes('--local');
  // Read whole lines in order, so a typed or piped answer is never dropped.
  const prompt = createInterface({ input: process.stdin });
  const lines = prompt[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    const { value, done } = await lines.next();
    return done ? '' : value;
  };
  const address = await ask('Address to delete: ');
  let sql;
  try {
    sql = deleteSql(address);
  } catch (error) {
    prompt.close();
    console.error(error.message);
    process.exit(1);
  }
  const where = local ? 'the local database' : 'the live database';
  const answer = await ask(`Delete ${normalizeEmail(address)} from ${where}? (y/N) `);
  prompt.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log('Nothing deleted.');
    return;
  }
  const require = createRequire(import.meta.url);
  const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  const args = [wrangler, 'd1', 'execute', DATABASE, local ? '--local' : '--remote', '--command', sql];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
