-- DÉPANNAGE : donner un mot de passe temporaire à un membre (sans e-mail)
-- Supabase > SQL Editor : remplacez les deux textes entre guillemets, puis Run.
-- Dites ensuite au membre de se connecter avec ce mot de passe (8 caractères minimum).
update auth.users
set encrypted_password = extensions.crypt('MotDePasseTemporaire123', extensions.gen_salt('bf'))
where email = 'EMAIL_DU_MEMBRE@gmail.com';
