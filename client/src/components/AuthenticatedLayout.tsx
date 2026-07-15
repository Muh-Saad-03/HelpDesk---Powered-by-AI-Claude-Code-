import { Outlet } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { ChatAssistant } from "./ChatAssistant";

// Pathless layout route for all signed-in pages. The assistant (text chat +
// voice) lives here (not inside individual pages) so chat history and a live
// voice call survive navigation between routes and the widget never renders
// on /login.
export function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <Outlet />
      <ChatAssistant />
    </RequireAuth>
  );
}
