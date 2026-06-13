import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";
import { homeForRole } from "./routerUtils";
import AppLayout from "../components/layout/AppLayout";
import Login from "../pages/auth/Login";
import StockLayout from "../pages/stock/StockLayout";
import Stock from "../pages/stock/Stock";
import CategoriesPage from "../pages/stock/CategoriesPage";
import SuppliersPage from "../pages/stock/SuppliersPage";
import VentesLayout from "../pages/sales/VentesLayout";
import NouvelleVente from "../pages/sales/NouvelleVente";
import SalesHistory from "../pages/sales/SalesHistory";
import AchatsLayout from "../pages/purchases/AchatsLayout";
import NouvelAchat from "../pages/purchases/NouvelAchat";
import AchatsHistory from "../pages/purchases/AchatsHistory";
import Factures from "../pages/invoices/Factures";
import Dashboard from "../pages/dashboard/Dashboard";
import MonEspace from "../pages/dashboard/MonEspace";
import EmployesLayout from "../pages/employees/EmployesLayout";
import FichesEmployes from "../pages/employees/FichesEmployes";
import SalairesPage from "../pages/employees/SalairesPage";
import AbsencesPage from "../pages/employees/AbsencesPage";
import PresencePage from "../pages/employees/PresencePage";
import MonProfil from "../pages/employees/MonProfil";
import ParametresLayout from "../pages/settings/ParametresLayout";
import StoreSettings from "../pages/settings/StoreSettings";
import Comptes from "../pages/settings/Comptes";

/** Redirige `/` vers l'accueil du rôle (le profil est garanti par PrivateRoute). */
function RoleHome() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeForRole(user.role) : "/login"} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protégé (authentification requise) */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<RoleHome />} />

          {/* Owner uniquement */}
          <Route element={<RoleRoute roles={["owner"]} />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="achats" element={<AchatsLayout />}>
              <Route index element={<NouvelAchat />} />
              <Route path="historique" element={<AchatsHistory />} />
            </Route>
            <Route path="factures" element={<Factures />} />
            <Route path="employes" element={<EmployesLayout />}>
              <Route index element={<FichesEmployes />} />
              <Route path="absences" element={<AbsencesPage />} />
              <Route path="presence" element={<PresencePage />} />
              <Route path="salaires" element={<SalairesPage />} />
            </Route>
            <Route path="parametres" element={<ParametresLayout />}>
              <Route index element={<StoreSettings />} />
              <Route path="comptes" element={<Comptes />} />
            </Route>
          </Route>

          {/* Employee uniquement */}
          <Route element={<RoleRoute roles={["employee"]} />}>
            <Route path="mon-espace" element={<MonEspace />} />
            <Route path="mon-profil" element={<MonProfil />} />
          </Route>

          {/* Partagé owner + employee */}
          <Route element={<RoleRoute roles={["owner", "employee"]} />}>
            <Route path="stock" element={<StockLayout />}>
              <Route index element={<Stock />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="fournisseurs" element={<SuppliersPage />} />
            </Route>
            <Route path="ventes" element={<VentesLayout />}>
              <Route index element={<NouvelleVente />} />
              <Route path="historique" element={<SalesHistory />} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Tout le reste → racine (puis redirection selon l'état d'auth) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
