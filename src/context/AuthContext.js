import React, { useContext, useState, useEffect } from "react";

import { firebase } from "../initFirebase";

// React Context variable
const AuthContext = React.createContext(null);

// Hook to simplify the usage of the context value
export const useAuth = () => useContext(AuthContext);

// Render a context provider
export const AuthProvider = ({ children }) => {
  // Authenticated & admin state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Listen to the Firebase Auth state and set the local state.
  useEffect(() => {
    const unregisterAuthObserver = firebase
      .auth()
      .onAuthStateChanged(async (user) => {
        setIsAuthenticated(!!user);

        if (firebase.auth().currentUser) {
          // Get the ID token which contains the "custom claims" to know about the admin status of the user
          let idTokenResult = await firebase
            .auth()
            .currentUser.getIdTokenResult(true);

          // Set admin status based on "admin" custom claim
          setIsAdmin(!!idTokenResult.claims.admin);
        }
      });

    // Make sure we un-register Firebase observers when the component unmounts.
    return () => unregisterAuthObserver();
  }, []);

  // Render the context provider and provide the "isAuthenticated" & "isAdmin" values
  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
