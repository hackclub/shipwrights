export interface Cert {
  id: number
  ftProjectId: string | null
  project: string | null
  type: string
  verdict: string
  certifier: string
  createdAt: string
  devTime: string
  submitter: string | null
  claimedBy?: string | null
  unlocksAt?: number | null
  yswsReturned?: boolean
  yswsReturnReason?: string | null
  yswsReturnedBy?: string | null
  customBounty?: number | null
}

export interface Stats {
  totalJudged: number
  approved: number
  rejected: number
  pending: number
  approvalRate: number
  avgQueueTime: string
  decisionsToday: number
  newShipsToday: number
}

export interface TypeCount {
  type: string
  count: number
}

export interface Reviewer {
  name: string
  count: number
}

export interface ShipCert {
  id: number
  ftId: string
  project: string
  type: string
  desc: string
  devTime: string
  submitter: {
    slackId: string
    username: string
  }
  links: {
    demo?: string
    repo?: string
    readme?: string
  }
  status: string
  feedback?: string
  proofVideo?: string
  reviewer?: {
    username: string
    avatar?: string
  }
  syncedToFt?: boolean
  notes?: {
    id: string
    text: string
    createdAt: string
    author: {
      username: string
      avatar?: string
    }
  }[]
  assignment?: {
    id: number
    status: string
    assignee: string | null
    createdAt: string
  } | null
  createdAt: string
  updatedAt: string
  customBounty?: number | null
}

export interface UserData {
  id: string
  username: string
  role?: string
  avatar?: string
}
