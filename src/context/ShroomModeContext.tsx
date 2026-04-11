'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ShroomModeContextType {
  isActive: boolean
  setIsActive: (active: boolean | ((prev: boolean) => boolean)) => void
}

const ShroomModeContext = createContext<ShroomModeContextType | undefined>(undefined)

export const ShroomModeProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActiveState] = useState(false)

  const setIsActive = (active: boolean | ((prev: boolean) => boolean)) => {
    if (typeof active === 'function') {
      setIsActiveState(active)
    } else {
      setIsActiveState(active)
    }
  }

  return (
    <ShroomModeContext.Provider value={{ isActive, setIsActive }}>
      {children}
    </ShroomModeContext.Provider>
  )
}

export const useShroomMode = () => {
  const context = useContext(ShroomModeContext)
  if (!context) {
    throw new Error('useShroomMode must be used within a ShroomModeProvider')
  }
  return context
}
