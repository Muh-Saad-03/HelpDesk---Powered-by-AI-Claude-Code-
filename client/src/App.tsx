import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Role } from "core";
import { LoginPage } from "./pages/LoginPage";
import { Home } from "./pages/Home";
import { UsersPage } from "./pages/UsersPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { AuthenticatedLayout } from "./components/AuthenticatedLayout";
import { RequireAuth } from "./components/RequireAuth";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/users"
            element={
              <RequireAuth role={Role.ADMIN}>
                <UsersPage />
              </RequireAuth>
            }
          />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
