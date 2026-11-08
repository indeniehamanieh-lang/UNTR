// Arbre des routes (fichier écrit à la main ; il est régénéré automatiquement à la construction si possible)
/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthRouteImport } from './routes/auth'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as VerifierTokenRouteImport } from './routes/verifier.$token'
import { Route as AuthenticatedAccueilRouteImport } from './routes/_authenticated/accueil'
import { Route as AuthenticatedAdhesionRouteImport } from './routes/_authenticated/adhesion'
import { Route as AuthenticatedAdminRouteImport } from './routes/_authenticated/admin'
import { Route as AuthenticatedAssistanceRouteImport } from './routes/_authenticated/assistance'
import { Route as AuthenticatedCarteRouteImport } from './routes/_authenticated/carte'
import { Route as AuthenticatedCotisationRouteImport } from './routes/_authenticated/cotisation'
import { Route as AuthenticatedDocumentsRouteImport } from './routes/_authenticated/documents'
import { Route as AuthenticatedFormationsRouteImport } from './routes/_authenticated/formations'
import { Route as AuthenticatedGalerieRouteImport } from './routes/_authenticated/galerie'
import { Route as AuthenticatedMembresRouteImport } from './routes/_authenticated/membres'
import { Route as AuthenticatedNotificationsRouteImport } from './routes/_authenticated/notifications'
import { Route as AuthenticatedOffresRouteImport } from './routes/_authenticated/offres'
import { Route as AuthenticatedProfilRouteImport } from './routes/_authenticated/profil'

const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({ id: '/_authenticated', getParentRoute: () => rootRouteImport } as any)
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const AuthRoute = AuthRouteImport.update({ id: '/auth', path: '/auth', getParentRoute: () => rootRouteImport } as any)
const ResetPasswordRoute = ResetPasswordRouteImport.update({ id: '/reset-password', path: '/reset-password', getParentRoute: () => rootRouteImport } as any)
const VerifierTokenRoute = VerifierTokenRouteImport.update({ id: '/verifier/$token', path: '/verifier/$token', getParentRoute: () => rootRouteImport } as any)
const AuthenticatedAccueilRoute = AuthenticatedAccueilRouteImport.update({ id: '/accueil', path: '/accueil', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedAdhesionRoute = AuthenticatedAdhesionRouteImport.update({ id: '/adhesion', path: '/adhesion', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedAdminRoute = AuthenticatedAdminRouteImport.update({ id: '/admin', path: '/admin', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedAssistanceRoute = AuthenticatedAssistanceRouteImport.update({ id: '/assistance', path: '/assistance', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedCarteRoute = AuthenticatedCarteRouteImport.update({ id: '/carte', path: '/carte', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedCotisationRoute = AuthenticatedCotisationRouteImport.update({ id: '/cotisation', path: '/cotisation', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedDocumentsRoute = AuthenticatedDocumentsRouteImport.update({ id: '/documents', path: '/documents', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedFormationsRoute = AuthenticatedFormationsRouteImport.update({ id: '/formations', path: '/formations', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedGalerieRoute = AuthenticatedGalerieRouteImport.update({ id: '/galerie', path: '/galerie', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedMembresRoute = AuthenticatedMembresRouteImport.update({ id: '/membres', path: '/membres', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedNotificationsRoute = AuthenticatedNotificationsRouteImport.update({ id: '/notifications', path: '/notifications', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedOffresRoute = AuthenticatedOffresRouteImport.update({ id: '/offres', path: '/offres', getParentRoute: () => AuthenticatedRouteRoute } as any)
const AuthenticatedProfilRoute = AuthenticatedProfilRouteImport.update({ id: '/profil', path: '/profil', getParentRoute: () => AuthenticatedRouteRoute } as any)

const AuthenticatedRouteRouteChildren = {
  AuthenticatedAccueilRoute,
  AuthenticatedAdhesionRoute,
  AuthenticatedAdminRoute,
  AuthenticatedAssistanceRoute,
  AuthenticatedCarteRoute,
  AuthenticatedCotisationRoute,
  AuthenticatedDocumentsRoute,
  AuthenticatedFormationsRoute,
  AuthenticatedGalerieRoute,
  AuthenticatedMembresRoute,
  AuthenticatedNotificationsRoute,
  AuthenticatedOffresRoute,
  AuthenticatedProfilRoute,
}
const AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)

const rootRouteChildren = {
  IndexRoute,
  AuthRoute,
  ResetPasswordRoute,
  VerifierTokenRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
}
export const routeTree = (rootRouteImport as any)._addFileChildren(rootRouteChildren) as any
