// Draws each bot's portrait from its id, so the roster's artwork is original and reproducible.
// Usage: node scripts/generate_bot_avatars.mjs [--check]
// The same id always produces the same SVG. --check fails when a committed portrait differs or
// when any other file is in web/public/bots.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skins = ['#f3d7bf', '#eac2a0', '#d9a57e', '#bf8761', '#9a6646', '#704a33'];
const hairs = ['#2a211e', '#4b3326', '#6f4529', '#a8693a', '#d4a85f', '#8f8a86', '#e6e0d4', '#9c3a2c', '#33425f'];
const shirts = {
  balanced: ['#2f9e88', '#5d6fbf', '#c08a2e', '#7b5aa6', '#3f7f9e'],
  aggressive: ['#c4493d', '#d9733a', '#b23a5b', '#a8402a', '#e0894a'],
  solid: ['#3c5a80', '#4f6b5a', '#5a5f73', '#2e6d78', '#6b5a48'],
};
const backgrounds = {
  Starter: ['#efe2c8', '#e6d3ad'],
  Developing: ['#d3e9e1', '#bcdcd0'],
  Club: ['#d8deef', '#c3cce6'],
  Expert: ['#ecd7df', '#e0c1cd'],
  Summit: ['#ddd5ef', '#cbbfe6'],
  Adaptive: ['#f1e3bd', '#e7d197'],
};
const ink = '#1d2430';

function stream(id) {
  const bytes = createHash('sha256').update(`askthemove-avatar:${id}`).digest();
  let index = 0;
  return {
    int: n => bytes[index++ % bytes.length] % n,
    pick(list) { return list[this.int(list.length)]; },
    chance(percent) { return this.int(100) < percent; },
  };
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = shift => Math.round(((value >> shift) & 255) * (1 - amount));
  return '#' + [16, 8, 0].map(shift => channel(shift).toString(16).padStart(2, '0')).join('');
}

const backHair = {
  long: c => `<path d="M27 46C24 22 72 22 69 46L72 80H24Z" fill="${c}"/>`,
  bob: c => `<path d="M28 45C25 21 71 21 68 45L70 63C62 67 34 67 26 63Z" fill="${c}"/>`,
};
const frontHair = {
  crop: c => `<path d="M31 41C30 24 66 24 65 41C60 33 36 33 31 41Z" fill="${c}"/>`,
  part: c => `<path d="M31 43C29 22 67 22 65 41C58 31 46 35 39 30C36 33 33 37 31 43Z" fill="${c}"/>`,
  curls: c => `<path d="M31 42C30 27 66 27 65 42C60 36 36 36 31 42Z" fill="${c}"/>${[33, 39, 45, 51, 57, 63].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 27 : 30}" r="6.5" fill="${c}"/>`).join('')}`,
  bun: c => `<circle cx="48" cy="20" r="7.5" fill="${c}"/><path d="M31 41C30 24 66 24 65 41C60 33 36 33 31 41Z" fill="${c}"/>`,
  fringe: c => `<path d="M31 45C29 24 67 24 65 45C62 39 57 35 48 37C40 35 34 39 31 45Z" fill="${c}"/>`,
  shaved: c => `<path d="M31 45C30 37 33 33 36 31L35 46ZM65 45C66 37 63 33 60 31L61 46Z" fill="${c}"/>`,
};
const hats = {
  beanie: (c, band) => `<path d="M30 39C30 17 66 17 66 39Z" fill="${c}"/><rect x="28" y="34" width="40" height="8" rx="4" fill="${band}"/><circle cx="48" cy="16" r="4.5" fill="${band}"/>`,
  cap: (c, band) => `<path d="M30 38C30 21 66 21 66 38Z" fill="${c}"/><path d="M30 37H73C71 41 62 42 56 40Z" fill="${band}"/>`,
};
const mouths = {
  smile: () => `<path d="M42 55Q48 60 54 55" fill="none" stroke="#7a3b34" stroke-width="2.2" stroke-linecap="round"/>`,
  grin: () => `<path d="M41.5 54Q48 62 54.5 54Z" fill="#7a3b34"/><path d="M43 54.6H53" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
  smirk: () => `<path d="M43 56.5Q49 58 54 54" fill="none" stroke="#7a3b34" stroke-width="2.2" stroke-linecap="round"/>`,
  calm: () => `<path d="M44 56H52" stroke="#7a3b34" stroke-width="2.2" stroke-linecap="round"/>`,
};
const brows = {
  aggressive: c => `<path d="M37 39.5L44 41.5M59 39.5L52 41.5" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
  solid: c => `<path d="M37 40.5H44M52 40.5H59" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
  balanced: c => `<path d="M37 41Q40.5 38.5 44 40.5M52 40.5Q55.5 38.5 59 41" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
};

export function avatarSvg(profile) {
  const r = stream(profile.id);
  const skin = r.pick(skins), skinShade = shade(skin, 0.14), hair = r.pick(hairs);
  const style = shirts[profile.style] ? profile.style : 'balanced';
  const shirt = r.pick(shirts[style]), [bg, halo] = backgrounds[profile.category] || backgrounds.Club;
  const back = r.chance(30) ? r.pick(Object.keys(backHair)) : null;
  const headwear = !back && r.chance(18) ? r.pick(Object.keys(hats)) : null;
  const front = r.pick(Object.keys(frontHair));
  const beard = !back && r.chance(18), moustache = !beard && !back && r.chance(12);
  const glasses = r.chance(26), earrings = r.chance(22), cheeks = r.chance(45);
  const happyEyes = r.chance(20), collar = r.pick(['crew', 'vee', 'turtle', 'scarf']);
  const mouth = r.pick(profile.style === 'aggressive' ? ['grin', 'smirk', 'smile'] : profile.style === 'solid' ? ['calm', 'smile', 'smirk'] : ['smile', 'grin', 'smile']);
  const accent = shade(shirt, 0.28);
  const parts = [
    `<rect x="8" y="9" width="80" height="80" rx="18" fill="${bg}"/>`,
    `<circle cx="48" cy="46" r="35" fill="${halo}"/>`,
    back ? backHair[back](hair) : '',
    `<path d="M14 96C16 77 30 69 48 69C66 69 80 77 82 96Z" fill="${shirt}"/>`,
    `<path d="M41 57H55V70C55 75 41 75 41 70Z" fill="${skinShade}"/>`,
    collar === 'vee' ? `<path d="M40 69L48 80L56 69Z" fill="${skinShade}"/>` :
      collar === 'turtle' ? `<rect x="38" y="66" width="20" height="9" rx="4.5" fill="${accent}"/>` :
      collar === 'scarf' ? `<path d="M34 70C40 76 56 76 62 70L63 76C56 81 40 81 33 76Z" fill="${accent}"/><path d="M55 76L59 90H52Z" fill="${accent}"/>` :
      `<path d="M39 70C42 74 54 74 57 70" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="31" cy="47" r="4.5" fill="${skin}"/><circle cx="65" cy="47" r="4.5" fill="${skin}"/>`,
    `<ellipse cx="48" cy="45" rx="17" ry="19" fill="${skin}"/>`,
    beard ? `<path d="M31 46C31 68 65 68 65 46C62 61 34 61 31 46Z" fill="${hair}"/>` : '',
    headwear ? hats[headwear](r.pick(Object.values(shirts).flat()), accent) : frontHair[front](hair),
    brows[style](shade(hair, 0.2)),
    happyEyes
      ? `<path d="M38.5 47.5Q41 44.5 43.5 47.5M52.5 47.5Q55 44.5 57.5 47.5" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<circle cx="41" cy="47" r="2.3" fill="${ink}"/><circle cx="55" cy="47" r="2.3" fill="${ink}"/><circle cx="41.8" cy="46.2" r=".7" fill="#fff"/><circle cx="55.8" cy="46.2" r=".7" fill="#fff"/>`,
    glasses ? `<g fill="none" stroke="${ink}" stroke-width="1.8"><circle cx="41" cy="47" r="5.6"/><circle cx="55" cy="47" r="5.6"/><path d="M46.6 46.5Q48 45.3 49.4 46.5M35.4 46L32 44.5M60.6 46L64 44.5"/></g>` : '',
    `<path d="M48 48.5Q46 52.5 48.8 53" fill="none" stroke="${shade(skin, 0.28)}" stroke-width="1.6" stroke-linecap="round"/>`,
    moustache ? `<path d="M41.5 53.5Q48 50 54.5 53.5Q48 55.5 41.5 53.5Z" fill="${hair}"/>` : '',
    mouths[mouth](),
    cheeks ? `<circle cx="36.5" cy="53" r="3" fill="#e5847866"/><circle cx="59.5" cy="53" r="3" fill="#e5847866"/>` : '',
    earrings ? `<circle cx="30.5" cy="52.5" r="1.8" fill="#e2b33e"/><circle cx="65.5" cy="52.5" r="1.8" fill="#e2b33e"/>` : '',
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 9 80 80" width="80" height="80">${parts.join('')}</svg>\n`;
}

export function avatarPath(profile) { return `web/public/bots/${profile.id}.svg`; }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const profiles = JSON.parse(readFileSync(new URL('../server/bot-profiles.json', import.meta.url), 'utf8'));
  const check = process.argv.includes('--check');
  const expected = new Set(profiles.map(profile => `${profile.id}.svg`));
  let problems = 0;
  for (const profile of profiles) {
    const file = root + avatarPath(profile), svg = avatarSvg(profile);
    if (profile.avatar !== `/bots/${profile.id}.svg`) { console.error(`${profile.id}: avatar must be /bots/${profile.id}.svg`); problems++; }
    if (check) {
      if (!existsSync(file) || readFileSync(file, 'utf8') !== svg) { console.error(`${profile.id}: portrait differs; run node scripts/generate_bot_avatars.mjs`); problems++; }
    } else writeFileSync(file, svg);
  }
  // Every file under the folder, at any depth, must be a profile's portrait. Writing removes stale
  // top-level SVGs, which are this script's own output; anything else is reported, never deleted.
  const folder = root + 'web/public/bots/';
  for (const name of readdirSync(folder, {recursive: true})) {
    if (expected.has(name) || !statSync(folder + name).isFile()) continue;
    if (!check && name.endsWith('.svg') && !name.includes('/')) unlinkSync(folder + name);
    else { console.error(`${name}: no profile uses this file`); problems++; }
  }
  if (problems) process.exit(1);
  console.log(`${check ? 'Checked' : 'Wrote'} ${profiles.length} portraits.`);
}
