import App from "./App";
import { AuthProvider } from "./context/AuthContext";

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
