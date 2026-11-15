import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Items from "./pages/Items";
import ItemDetailPage from "./pages/ItemDetailPage";
import UnitDetailPage from "./pages/UnitDetailPage";
import Scan from "./pages/Scan";
import Categories from "./pages/Categories";
import Locations from "./pages/Locations";
import Users from "./pages/Users";
import ActivityLog from "./pages/ActivityLog";
import Print from "./pages/Print";
import Reports from "./pages/Reports";   // ← BARU
import ReportsPrint from "./pages/ReportsPrint";


export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
    useThemeStore.getState();
  }, [init]);

  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ================= PROTECTED: semua role ================= */}
      <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin", "viewer"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/units/:id" element={<UnitDetailPage />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/print" element={<Print />} />
          <Route path="/reports" element={<Reports />} />   {/* ← BARU */}
        </Route>
      </Route>

      {/* ================= PROTECTED: admin & super_admin ================= */}
      <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/categories" element={<Categories />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/activity" element={<ActivityLog />} />
        </Route>
      </Route>

      {/* ================= PROTECTED: super_admin only ================= */}
      <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/users" element={<Users />} />
        </Route>
      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />

      <Route path="/reports/print" element={<ReportsPrint />} />

    </Routes>
  );
}