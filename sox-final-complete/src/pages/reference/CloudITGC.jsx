import { Cloud } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
const CLOUD = [
  {domain:'Logical Access',aws:'IAM + CloudTrail + Organizations SCP',azure:'Entra ID + PIM + RBAC',gcp:'IAM + Cloud Audit Logs + Org Policies',gap:'NHI service accounts excluded from access reviews'},
  {domain:'Change Management',aws:'CodePipeline + CloudFormation + CODEOWNERS',azure:'Azure DevOps approval gates + ARM templates',gcp:'Cloud Deploy + Cloud Build + CODEOWNERS',gap:'Console changes bypass IaC pipeline — no audit trail'},
  {domain:'Computer Operations',aws:'CloudWatch Events + AWS Backup + DR runbook',azure:'Azure Monitor + Azure Backup + Site Recovery',gcp:'Cloud Monitoring + Cloud Backup + DR runbook',gap:'Backup green but restore never tested'},
  {domain:'Program Development',aws:'Separate accounts per env + CodeGuru SAST',azure:'Separate subscriptions + Defender for DevOps',gcp:'Separate projects + Binary Authorization',gap:'Business UAT not documented for IaC deployments'},
]
export default function CloudITGC() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader eyebrow={<><Cloud size={12}/>Reference · Cloud ITGC</>} title="Cloud ITGC — AWS, Azure, GCP"
        subtitle="Cloud-native evidence sources per ITGC domain. Shared responsibility: provider secures infrastructure; you secure access, config, and code." />
      <div className="alert-warn mb-5"><span className="text-sm">Non-human identities (service accounts, API keys, Lambda roles) now outnumber human users 10:1. Include in quarterly access reviews. PCAOB inspectors are flagging NHI exclusions.</span></div>
      <div className="space-y-3">
        {CLOUD.map(r=>(
          <div key={r.domain} className="card">
            <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">{r.domain}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {[{p:'AWS',v:r.aws,c:'badge-amber'},{p:'Azure',v:r.azure,c:'badge-blue'},{p:'GCP',v:r.gcp,c:'badge-green'}].map(x=>(
                <div key={x.p} className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-surface-3">
                  <span className={`badge ${x.c} mb-1.5 block w-fit`}>{x.p}</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{x.v}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 flex gap-1.5"><span className="font-semibold">Common gap:</span>{r.gap}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
