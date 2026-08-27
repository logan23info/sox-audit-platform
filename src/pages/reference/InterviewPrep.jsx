import { useState } from 'react'
import { GraduationCap, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
const DECK = [
  {q:'What are the four ITGC domains?',a:'Logical Access (LA), Change Management (CM), Computer Operations (CO), and Program Development (PD). JE testing is a fifth required fraud risk procedure under AS 2110.'},
  {q:'What is IPE and why does it matter?',a:'Information Produced by the Entity — system-generated reports used in controls. Must be validated for completeness and accuracy per AS 1105.10A before any control relying on it can be tested. #1 PCAOB inspection finding 2023–2025.'},
  {q:'What is the difference between SD and MW?',a:'SD: more than remote possibility of misstatement, not material — requires audit committee communication before FY-end. MW: reasonable possibility of material misstatement — requires public 10-K Item 9A disclosure and modifies CEO/CFO §302 certification.'},
  {q:'How do you test user deprovisioning?',a:'Obtain HR termination list → cross-reference to system user list → verify access revoked within SLA (typically 24 hrs). Any terminated user with active access = exception.'},
  {q:'What makes an access review rubber-stamping?',a:'Manager certifies access in bulk without reviewing individual users — approving everyone in seconds or certifying people who no longer report to them. Operating effectiveness failure even though the review was completed.'},
  {q:'Most common change management deficiency?',a:'Approval timestamp after the deployment timestamp. Even if the change was benign, the control (authorization before deployment) failed.'},
  {q:'When can you rely on a SOC 1 report?',a:'Type II only. Period must cover your fiscal year (bridge letter if gap). Opinion must be unqualified (evaluate exceptions if qualified). All CUECs must be tested. No SOC 1 = direct testing or compensating controls.'},
  {q:'What is a CUEC?',a:'Complementary User Entity Control — a control the SOC 1 report assumes your organization is operating. Failing to test CUECs = you cannot place reliance on the SOC 1 report.'},
  {q:'Sample size for a high-risk daily control?',a:'30–40 items per PCAOB AS 2315. Base 25–30 for standard high-risk daily; add 25% if new/redesigned; add 40% if prior period exceptions.'},
  {q:'What are JE fraud risk procedures?',a:'Required under AS 2110.61. Steps: (1) validate JE population as IPE, (2) segment by risk (after-hours, period-end, round-dollar, new preparers), (3) test high-risk segments with targeted samples, (4) test random general sample, (5) evaluate for fraud indicators.'},
  {q:'What is developer access to production?',a:'A SoD violation — developer can both create and deploy code without independent review. Typically classified SD or MW. Test by cross-referencing developer list to production access list — zero overlap expected.'},
  {q:'How long must a remediated control operate before re-testing MW?',a:'Minimum 90–180 days. The control must demonstrate sustained effectiveness, not just implementation. External auditors must independently verify.'},
]
export default function InterviewPrep() {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [filter, setFilter] = useState('all')
  const total = DECK.length
  const next = () => { setIdx(i=>(i+1)%total); setFlipped(false) }
  const prev = () => { setIdx(i=>(i-1+total)%total); setFlipped(false) }
  const c = DECK[idx]
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader eyebrow={<><GraduationCap size={12}/>Reference · Interview Prep</>} title="SOX IT audit interview prep"
        subtitle={`${total} questions — click card to reveal answer`} />
      <div className="flex justify-between text-sm text-gray-400 mb-3">
        <span>Card {idx+1} of {total}</span>
        <button onClick={()=>setIdx(Math.floor(Math.random()*total))} className="text-brand-600 text-xs">Shuffle</button>
      </div>
      <div className="cursor-pointer select-none mb-4" onClick={()=>setFlipped(f=>!f)} style={{minHeight:180}}>
        <div className={`card transition-all ${flipped?'border-brand-500 bg-brand-50 dark:bg-blue-900/10':''}`} style={{minHeight:180}}>
          {!flipped ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3" style={{minHeight:164}}>
              <span className="eyebrow">Interview question</span>
              <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{c.q}</p>
              <p className="text-xs text-gray-400 mt-2">Tap to reveal answer</p>
            </div>
          ) : (
            <div style={{minHeight:164}}>
              <span className="eyebrow mb-2">Strong answer</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.a}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-outline" onClick={prev}>← Prev</button>
        <div className="flex gap-1 flex-wrap justify-center">{DECK.map((_,i)=>(
          <button key={i} onClick={()=>{setIdx(i);setFlipped(false)}} className={`w-2 h-2 rounded-full transition-all ${i===idx?'bg-brand-600 w-4':'bg-gray-300 dark:bg-gray-600'}`}/>
        ))}</div>
        <button className="btn btn-primary" onClick={next}>Next →</button>
      </div>
    </div>
  )
}
