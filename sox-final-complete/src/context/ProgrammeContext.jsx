import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { getProgramme, getMyRole } from '../lib/supabase'

const ProgrammeContext = createContext({})
export const useProgramme = () => useContext(ProgrammeContext)

export function ProgrammeProvider({ children }) {
  const { user } = useAuth()
  const [programme,    setProgramme]    = useState(null)
  const [myRole,       setMyRole]       = useState(null)
  const [programmeId,  setProgrammeId]  = useState(() => localStorage.getItem('sox_programme_id'))

  const selectProgramme = (id) => {
    setProgrammeId(id)
    if (id) localStorage.setItem('sox_programme_id', id)
    else localStorage.removeItem('sox_programme_id')
  }

  useEffect(() => {
    if (!programmeId || !user) { setProgramme(null); setMyRole(null); return }
    getProgramme(programmeId).then(setProgramme)
    getMyRole(programmeId, user.id).then(r => setMyRole(r?.role ?? null))
  }, [programmeId, user])

  const isLead     = myRole === 'Lead'
  const isAuditor  = myRole === 'Lead' || myRole === 'Auditor'
  const isReviewer = !!myRole

  return (
    <ProgrammeContext.Provider value={{ programme, programmeId, myRole, isLead, isAuditor, isReviewer, selectProgramme, setProgramme }}>
      {children}
    </ProgrammeContext.Provider>
  )
}
