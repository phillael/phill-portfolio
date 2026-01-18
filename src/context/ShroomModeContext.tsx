'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ShroomModeContextType {
  isActive: boolean
  setIsActive: (active: boolean) => void
}

const ShroomModeContext = createContext<ShroomModeContextType | undefined>(undefined)

export const ShroomModeProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false)

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
