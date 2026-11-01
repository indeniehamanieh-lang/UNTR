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

---

# MISE À JOUR 1 — Back-office sur ordinateur + pièces d'identité

## A. Base de données (Supabase)
SQL Editor → nouvelle requête → collez `supabase/update-1.sql` → Run.

## B. Mettre en ligne le site (back-office)
1. Mettez les fichiers sur GitHub (Upload files + Commit).
2. Dépôt → **Settings → Pages** → « Source » : choisissez **GitHub Actions**.
3. Onglet **Actions** → attendez que « Publier le site back-office » soit vert.
4. L'adresse du site s'affiche dans Settings → Pages (ex. `https://votrenom.github.io/votre-depot/`).
5. Sur ordinateur : ouvrez cette adresse → « Se connecter » avec votre compte administrateur. Vous arrivez directement dans le back-office.

Remarque : GitHub Pages est gratuit pour un dépôt public. Pour un dépôt privé, il faut un abonnement GitHub payant.

## C. QR code des cartes
Une fois l'adresse du site connue, ouvrez `src/config.ts` et remplissez `SITE_URL` avec cette adresse (sans `/` à la fin), puis reconstruisez l'APK.

---

# MISE À JOUR 2 — Métier radio / télévision
Supabase → SQL Editor → collez `supabase/update-2.sql` → Run (nouvelle liste de spécialités + champ « Employeur / média »).

---

# MISE À JOUR 3 — Mot de passe oublié, réseaux sociaux, galerie

1. Supabase → SQL Editor → collez `supabase/update-3.sql` → Run.
2. Mot de passe oublié (par code) : Supabase → Authentication → Emails → modèle « Reset password » :
   remplacez le contenu par un texte contenant le code, par exemple :
   `<h2>Votre code</h2><p>Code pour changer votre mot de passe : <b>{{ .Token }}</b></p>`
   puis Save.
3. Back-office → onglets « Réseaux sociaux » et « Galerie ».

---

# MISE À JOUR 4 — E-mails, app des membres / site des responsables

## E-mails (code de mot de passe oublié, confirmation)
Supabase n'envoie des e-mails qu'aux membres de votre équipe Supabase, tant qu'un service d'e-mail personnel n'est pas branché.
Supabase → Authentication → Emails → **SMTP Settings** → « Enable custom SMTP » :
- Option Gmail : Host `smtp.gmail.com`, Port `465`, Username = l'adresse Gmail, Password = « mot de passe d'application » (Compte Google → Sécurité → Validation en 2 étapes → Mots de passe d'application), Sender = la même adresse Gmail.
- Option Brevo : compte gratuit sur brevo.com → SMTP & API → reprenez l'hôte, le port, l'identifiant et la clé SMTP.
Ensuite : Authentication → Emails → Templates → « Reset password » : ajoutez `{{ .Token }}` dans le texte → Save.
Dépannage immédiat sans e-mail : `supabase/reset-mot-de-passe.sql`.

## Deux produits séparés
- **APK (membres)** : ne contient plus aucun accès au back-office.
- **Site web (responsables)** : adresse dans GitHub → Settings → Pages. Il ouvre directement la connexion, sans création de compte.

---

# MISE À JOUR 5 — Cotisations (paiement déclaré)
1. Supabase → SQL Editor → collez `supabase/update-4.sql` → Run.
2. Site back-office → onglet **Cotisations** : indiquez le montant, la durée et les numéros Mobile Money de l'Union.
3. Dans l'app : bouton **Cotisation** sur l'accueil. Le membre paie, saisit la référence du SMS, joint une capture ; un responsable valide dans le back-office.

# Devenir le premier super administrateur
Ouvrez le SITE back-office (pas l'APK), connectez-vous avec votre compte, puis cliquez sur « Configuration initiale : devenir le premier super administrateur ». À faire en premier, avant que d'autres personnes ne connaissent l'adresse du site.

---

# BACK-OFFICE AUTONOME : backoffice-untrtci.html
Un seul fichier, à ouvrir par double-clic sur ordinateur (Chrome ou Edge), avec internet. Aucun hébergement, aucun GitHub, aucun Lovable.
