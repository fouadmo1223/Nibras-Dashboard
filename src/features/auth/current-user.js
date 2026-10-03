import { createContext, useContext } from 'react';

/** The signed-in, authorised user. Provided by RequireAuth, so it is never null inside protected routes. */
export const CurrentUserContext = createContext(null);

export function useCurrentUser() {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error('useCurrentUser must be used inside <RequireAuth>.');
  return user;
}
