# Déploiement sur Render

## Prérequis

- Compte [Render](https://render.com)
- Repo GitHub/GitLab avec ce projet
- Clés API : `FOOTBALL_API_KEY` (football-data.org), `BSD_API_KEY` (sélections)

## Option A — Blueprint (recommandé)

1. Poussez le code sur GitHub (sans le fichier `.env`).
2. Render → **New** → **Blueprint**.
3. Connectez le repo : Render lit `render.yaml` automatiquement.
4. Dans le dashboard du service, ajoutez les variables marquées `sync: false` :
   - `FOOTBALL_API_KEY`
   - `BSD_API_KEY`
   - (optionnel) `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
5. Notez `ADMIN_PASSWORD` généré par Render (onglet **Environment**).
6. Une fois déployé, ouvrez l’URL Render (`https://xxx.onrender.com`).

## Option B — Manuel

1. Render → **New** → **Web Service** → connectez le repo.
2. Paramètres :
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Health Check Path** : `/api/health`
3. **Disks** → Add disk :
   - Mount path : `/data`
   - Size : 1 GB
4. **Environment** :

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `DB_PATH` | `/data/database.sqlite` |
| `JWT_SECRET` | chaîne aléatoire (32+ caractères) |
| `ADMIN_PSEUDO` | `admin` |
| `ADMIN_PASSWORD` | mot de passe fort |
| `FOOTBALL_API_KEY` | votre clé |
| `BSD_API_KEY` | votre clé |
| `FOOTBALL_API_BASE_URL` | `https://api.football-data.org/v4` |
| `COMPETITION_CODE` | `WC` |

5. **Create Web Service**.

## Après le déploiement

1. Connectez-vous avec le compte admin (`ADMIN_PSEUDO` / `ADMIN_PASSWORD`).
2. Admin → **⟳ Calendrier**, **⟳ Scores**, **⟳ Sélections**.
3. Partagez l’URL Render aux joueurs (plus besoin de `192.168.x.x`).

## Générer les secrets

```bash
# JWT
openssl rand -hex 32

# Notifications push (optionnel)
npx web-push generate-vapid-keys
```

## Points importants

- **Disque persistant** : sans lui, SQLite est effacée à chaque redéploiement.
- **Plan Starter** : le disque persistant et l’absence de mise en veille sont recommandés pour une app avec cron.
- **Plan Free** : le service s’endort après 15 min d’inactivité (premier chargement lent).
- Les notifications push nécessitent **HTTPS** (Render le fournit) + clés VAPID.

## Docker (optionnel)

Un `Dockerfile` est disponible pour un déploiement Docker sur Render :

- **Environment** : Docker
- **Dockerfile Path** : `./Dockerfile`
- Monte `/data` comme disque persistant.
