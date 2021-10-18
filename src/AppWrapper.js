import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import {LanguageProvider} from "./context/Language";

export default function AppWrapper() {
  return (
      <LanguageProvider>
          <AuthProvider>
              <App />
          </AuthProvider>
      </LanguageProvider>
  );
}
