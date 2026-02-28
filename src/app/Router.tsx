import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { HomeView } from '../views/HomeView'
import { ExploreView } from '../views/ExploreView'
import { AskView } from '../views/AskView'
import { IngestView } from '../views/IngestView'
import { AutomateView } from '../views/AutomateView'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomeView /> },
      { path: '/explore', element: <ExploreView /> },
      { path: '/ask', element: <AskView /> },
      { path: '/ingest', element: <IngestView /> },
      { path: '/automate', element: <AutomateView /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
