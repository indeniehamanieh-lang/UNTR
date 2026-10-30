# UNTRTCI — Guide pour obtenir votre APK (sans rien installer)

## Étape 1 — Créer votre base de données (gratuit)
1. Allez sur supabase.com → créez un compte → « New project » (notez le mot de passe).
2. Menu **SQL Editor** → « New query » → collez tout le contenu de `supabase/schema.sql` → **Run**.
3. Nouvelle requête → collez `supabase/storage.sql` → **Run**.
4. Menu **Project Settings → API** : copiez l'**URL** du projet et la clé **anon / publishable**.
5. Menu **Authentication → Providers → Email** : désactivez « Confirm email » (plus simple pour commencer).

## Étape 2 — Mettre les fichiers sur GitHub
1. Sur github.com, créez un dépôt (« New repository »).
2. « Add file → Upload files » : glissez TOUT le contenu de ce dossier (y compris le dossier `.github`), puis « Commit ».

## Étape 3 — Donner vos clés à GitHub
Dépôt → **Settings → Secrets and variables → Actions → New repository secret**. Créez :
- `VITE_SUPABASE_URL` = l'URL copiée à l'étape 1
- `VITE_SUPABASE_PUBLISHABLE_KEY` = la clé copiée à l'étape 1

## Étape 4 — Récupérer l'APK
Dépôt → onglet **Actions** → « Construire l'APK Android » → **Run workflow**.
Après quelques minutes, ouvrez l'exécution terminée : en bas, **UNTRTCI-apk** à télécharger (zip contenant `app-debug.apk`).
Envoyez-le sur un téléphone Android et installez-le.

## Étape 5 — Devenir administrateur
Ouvrez l'app, créez votre compte, allez dans **Profil** et utilisez le bouton pour devenir super administrateur (possible une seule fois, pour le premier compte).
Le back-office est ensuite accessible depuis l'app.

## Play Store (plus tard)
Il faut un compte développeur Google Play (25 $, une fois) et un APK « signé ». Cette étape viendra après les tests : je vous guiderai.
