import { Outlet } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { VoiceAssistant } from "./VoiceAssistant";

// Pathless layout route for all signed-in pages. The voice assistant lives
// here (not inside individual pages) so a live call survives navigation
// between routes and the widget never renders on /login.
export function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <Outlet />
      <VoiceAssistant />
    </RequireAuth>
  );
}
