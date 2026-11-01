# Sprint Kanban

Tableau kanban de features par sprint de 3 semaines (le sprint 7 commence le 19/10/2026), construit avec [SVAR React Kanban](https://svar.dev/react/kanban/).

Chaque feature a : titre, points de complexité, version de spec, version applicative, n° Jira, jours passés.
L'en-tête de chaque colonne affiche la somme des points de complexité du sprint.

## Confidentialité

- Les données sont stockées uniquement dans le `localStorage` du navigateur.
- Export / import en fichier JSON local (sauvegarde, transfert vers un autre poste).
- La version publiée embarque une Content-Security-Policy `connect-src 'none'` : la page ne peut envoyer aucune requête réseau, et toutes les ressources (JS, CSS) sont servies depuis le site lui-même.

## Développement

```bash
npm install
npm run dev
```

## Déploiement sur GitHub Pages

1. Pousser ce dossier sur la branche `main` d'un dépôt GitHub.
2. Dans *Settings → Pages*, choisir **Source : GitHub Actions**.
3. Le workflow `.github/workflows/deploy.yml` construit et publie le site à chaque push.
