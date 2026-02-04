// Internal audit tags - for tracking patterns, NOT for composing feedback
// These are stored internally and don't appear in the feedback sent to users

export interface AuditTag {
  id: string
  label: string
  category: 'positive' | 'negative' | 'neutral'
}

// Tags for approved projects - helps us understand what makes good submissions
export const APPROVAL_TAGS: AuditTag[] = [
  { id: 'good-demo', label: 'Good demo', category: 'positive' },
  { id: 'creative', label: 'Creative/Original', category: 'positive' },
  { id: 'polished', label: 'Polished', category: 'positive' },
  { id: 'good-readme', label: 'Good README', category: 'positive' },
  { id: 'learned-something', label: 'Learned something new', category: 'positive' },
  { id: 'exceeded-expectations', label: 'Exceeded expectations', category: 'positive' },
  { id: 'first-time-builder', label: 'First-time builder', category: 'neutral' },
  { id: 'resubmission', label: 'Resubmission (improved)', category: 'neutral' },
]

// Tags for rejected projects - helps us track common issues
export const REJECTION_TAGS: AuditTag[] = [
  { id: 'demo-broken', label: 'Demo broken/missing', category: 'negative' },
  { id: 'demo-slow', label: 'Demo too slow', category: 'negative' },
  { id: 'no-readme', label: 'No/poor README', category: 'negative' },
  { id: 'tutorial-clone', label: 'Tutorial clone', category: 'negative' },
  { id: 'ai-slop', label: 'Suspected AI-generated', category: 'negative' },
  { id: 'incomplete', label: 'Incomplete/WIP', category: 'negative' },
  { id: 'no-originality', label: 'Nothing original', category: 'negative' },
  { id: 'cant-verify', label: "Couldn't verify it works", category: 'negative' },
  { id: 'wrong-links', label: 'Wrong/dead links', category: 'negative' },
  { id: 'private-repo', label: 'Private repo', category: 'negative' },
]

// Checklist reminders for reviewers
export const FEEDBACK_CHECKLIST = {
  approve: [
    'Mention something specific you liked about THIS project',
    'Reference something you actually saw (demo, code, feature)',
  ],
  reject: [
    'Explain what you tried/looked at',
    'State the main blocker clearly',
    'Give actionable next steps',
    'Invite them to resubmit',
  ],
}

// Suggested next steps for rejections
export const SUGGESTED_NEXT_STEPS = [
  'Add a working demo link (public URL or video)',
  'Update README with: what it does, how to run it',
  'Make sure demo loads in incognito/fresh browser',
  'Add more original features beyond the tutorial',
  'Explain what you learned and built yourself',
  'Record a short walkthrough video showing it working',
  'Add a unique feature that shows YOUR idea, not just tutorial code',
  'Explain in README what makes this project yours',
]
