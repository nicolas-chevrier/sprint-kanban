import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En production, une Content-Security-Policy stricte interdit toute requête
// réseau sortante (fetch, XHR, WebSocket, beacon) : les données restent dans le navigateur.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'self'",
].join('; ');

function cspPlugin() {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

// Les feuilles de style SVAR déclarent des polices hébergées sur cdn.svar.dev :
// on retire ces @font-face pour qu'aucune ressource externe ne soit chargée.
function stripRemoteFonts() {
  return {
    name: 'strip-remote-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@svar-ui') || !/\.css($|\?)/.test(id)) return null;
      return code.replace(/@font-face\s*\{[^}]*https?:\/\/[^}]*\}/g, '');
    },
  };
}

export default defineConfig({
  // Chemins relatifs : fonctionne quel que soit le nom du dépôt GitHub Pages.
  base: './',
  plugins: [stripRemoteFonts(), react(), cspPlugin()],
});
