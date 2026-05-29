import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initApiClient } from '../shared/api/client'
import { useAuthStore } from '../modules/auth/store'
import { authApi } from '../modules/auth/api'
import ErrorBoundary from '../shared/ui/ErrorBoundary'
import ToastContainer from '../shared/ui/ToastContainer'

// Connect auth store to API client once — no circular deps, lazy resolution at runtime
initApiClient(() => useAuthStore.getState())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60, // 1 min default
      refetchOnWindowFocus: false,
    },
  },
})

// Valida la sesión con el backend al montar la app.
// Solo hace logout en 401 real (cookie expirada) — ignora errores de red (servidor durmiendo).
function AuthInitializer() {
  const { isAuthenticated, setUser, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    authApi.me()
      .then((user) => setUser(user))
      .catch((err) => {
        if (err?.response?.status === 401) logout()
        // Errores de red / 5xx: mantener sesión y dejar que el usuario reintente
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
