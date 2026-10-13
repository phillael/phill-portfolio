'use client'

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react'

interface ShroomModeContextType {
  isActive: boolean
  setIsActive: Dispatch<SetStateAction<boolean>>
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

/** Whether site shroom mode is on, or false outside the provider (for components that only follow it). */
export const useShroomActive = () => useContext(ShroomModeContext)?.isActive ?? false

export const useShroomMode = () => {
  const context = useContext(ShroomModeContext)
  if (!context) {
    throw new Error('useShroomMode must be used within a ShroomModeProvider')
  }
  return context
}
