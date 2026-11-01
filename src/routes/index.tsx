import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { IS_ADMIN_SITE } from "@/lib/target";
import logo from "@/assets/untrtci-logo.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/session";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (IS_ADMIN_SITE) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "UNTRTCI — Techniciens Radio et TV de Côte d'Ivoire" },
      { name: "description", content: "Adhérez à l'UNTRTCI, obtenez votre carte de membre numérique, suivez les formations et les missions." },
      { property: "og:title", content: "UNTRTCI" },
      { property: "og:description", content: "L'application officielle des techniciens radio et télévision de Côte d'Ivoire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <div className="bg-hero px-6 pb-10 pt-12 text-primary-foreground">
        <div className="mx-auto w-fit rounded-2xl bg-card p-3 shadow-soft">
          <img src={logo.url} alt="Logo UNTRTCI" className="h-24 w-auto" />
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold">UNTRTCI</h1>
        <p className="mt-2 text-center text-sm opacity-90">
          Union Nationale des Techniciens Radio et Télévision de Côte d'Ivoire
        </p>
      </div>
      <div className="-mt-6 flex-1 rounded-t-3xl bg-background px-6 pt-6">
        <div className="mt-8 space-y-3 pb-10">
          {user ? (
            <Button asChild size="lg" className="w-full"><Link to="/accueil">Ouvrir l'application</Link></Button>
          ) : (
            <>
              <Button asChild size="lg" className="w-full"><Link to="/auth" search={{ mode: "signup" }}>Créer un compte</Link></Button>
              <Button asChild size="lg" variant="outline" className="w-full"><Link to="/auth" search={{ mode: "signin" }}>Se connecter</Link></Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
