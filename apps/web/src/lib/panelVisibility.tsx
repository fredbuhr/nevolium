import { createContext, useContext } from 'react'

// Dockview knows when a tab is hidden even if its subtree remains mounted.
export const PanelVisibilityContext = createContext(true)
export const usePanelVisibility = () => useContext(PanelVisibilityContext)

export const PanelNavigationContext = createContext<(key: string) => void>(() => {})
export const usePanelNavigation = () => useContext(PanelNavigationContext)
