'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface ReportData {
  [key: string]: unknown
}

interface ReportContextType {
  reportData: ReportData | null
  setReportData: (data: ReportData | null) => void
}

const ReportContext = createContext<ReportContextType>({
  reportData: null,
  setReportData: () => {},
})

export function ReportContextProvider({ children }: { children: ReactNode }) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  return (
    <ReportContext.Provider value={{ reportData, setReportData }}>
      {children}
    </ReportContext.Provider>
  )
}

export function useReportContext() {
  return useContext(ReportContext)
}
