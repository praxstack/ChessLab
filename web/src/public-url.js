// Files in web/public are served next to the app. The browser app can live under a sub-path
// (askthemove.online/betapp/), so every such file is named through here, never as a bare "/file".
const BASE = import.meta.env?.BASE_URL || '/';
export const publicUrl = path => BASE + String(path).replace(/^\/+/, '');
