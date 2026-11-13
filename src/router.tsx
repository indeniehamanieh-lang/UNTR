/* eslint-disable */
// @ts-nocheck
import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as LayoutImport } from "./routes/_authenticated/route";
import { Route as IndexImport } from "./routes/index";
import { Route as AuthImport } from "./routes/auth";
import { Route as ResetPasswordImport } from "./routes/reset-password";
import { Route as VerifierTokenImport } from "./routes/verifier.$token";
import { Route as AAccueilImport } from "./routes/_authenticated/accueil";
import { Route as AAdhesionImport } from "./routes/_authenticated/adhesion";
import { Route as AAdminImport } from "./routes/_authenticated/admin";
import { Route as AAssistanceImport } from "./routes/_authenticated/assistance";
import { Route as ACarteImport } from "./routes/_authenticated/carte";
import { Route as ACotisationImport } from "./routes/_authenticated/cotisation";
import { Route as ADocumentsImport } from "./routes/_authenticated/documents";
import { Route as AFormationsImport } from "./routes/_authenticated/formations";
import { Route as AGalerieImport } from "./routes/_authenticated/galerie";
import { Route as AMembresImport } from "./routes/_authenticated/membres";
import { Route as ANotificationsImport } from "./routes/_authenticated/notifications";
import { Route as AOffresImport } from "./routes/_authenticated/offres";
import { Route as AProfilImport } from "./routes/_authenticated/profil";

// Liste des pages de l'application (à compléter ici quand on ajoute une page)
const layout = LayoutImport.update({ id: '/_authenticated', getParentRoute: () => rootRoute } as any);
const IndexR = IndexImport.update({ id: '/', path: '/', getParentRoute: () => rootRoute } as any);
const AuthR = AuthImport.update({ id: '/auth', path: '/auth', getParentRoute: () => rootRoute } as any);
const ResetPasswordR = ResetPasswordImport.update({ id: '/reset-password', path: '/reset-password', getParentRoute: () => rootRoute } as any);
const VerifierTokenR = VerifierTokenImport.update({ id: '/verifier/$token', path: '/verifier/$token', getParentRoute: () => rootRoute } as any);
const AAccueilR = AAccueilImport.update({ id: '/accueil', path: '/accueil', getParentRoute: () => layout } as any);
const AAdhesionR = AAdhesionImport.update({ id: '/adhesion', path: '/adhesion', getParentRoute: () => layout } as any);
const AAdminR = AAdminImport.update({ id: '/admin', path: '/admin', getParentRoute: () => layout } as any);
const AAssistanceR = AAssistanceImport.update({ id: '/assistance', path: '/assistance', getParentRoute: () => layout } as any);
const ACarteR = ACarteImport.update({ id: '/carte', path: '/carte', getParentRoute: () => layout } as any);
const ACotisationR = ACotisationImport.update({ id: '/cotisation', path: '/cotisation', getParentRoute: () => layout } as any);
const ADocumentsR = ADocumentsImport.update({ id: '/documents', path: '/documents', getParentRoute: () => layout } as any);
const AFormationsR = AFormationsImport.update({ id: '/formations', path: '/formations', getParentRoute: () => layout } as any);
const AGalerieR = AGalerieImport.update({ id: '/galerie', path: '/galerie', getParentRoute: () => layout } as any);
const AMembresR = AMembresImport.update({ id: '/membres', path: '/membres', getParentRoute: () => layout } as any);
const ANotificationsR = ANotificationsImport.update({ id: '/notifications', path: '/notifications', getParentRoute: () => layout } as any);
const AOffresR = AOffresImport.update({ id: '/offres', path: '/offres', getParentRoute: () => layout } as any);
const AProfilR = AProfilImport.update({ id: '/profil', path: '/profil', getParentRoute: () => layout } as any);
const layoutWithChildren = layout._addFileChildren({ AAccueilR, AAdhesionR, AAdminR, AAssistanceR, ACarteR, ACotisationR, ADocumentsR, AFormationsR, AGalerieR, AMembresR, ANotificationsR, AOffresR, AProfilR });
const routeTree = rootRoute._addFileChildren({ IndexR, AuthR, ResetPasswordR, VerifierTokenR, layoutWithChildren });

export const getRouter = () => {
  const queryClient = new QueryClient();
  return createRouter({
    routeTree,
    history: createHashHistory(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
