// Internal audit tags - for tracking patterns, NOT for composing feedback
// These are stored internally and don't appear in the feedback sent to users

export interface AuditTag {
  id: string
  label: string
  category: 'highlight' | 'needs-work' | 'note'
}

// Tags for shipped projects - helps us understand what makes good submissions
export const SHIPPED_TAGS: AuditTag[] = [
  { id: 'good-demo', label: 'Good demo', category: 'highlight' },
  { id: 'creative', label: 'Creative/Original', category: 'highlight' },
  { id: 'polished', label: 'Polished', category: 'highlight' },
  { id: 'good-readme', label: 'Good README', category: 'highlight' },
  { id: 'learned-something', label: 'Learned something new', category: 'highlight' },
  { id: 'exceeded-expectations', label: 'Exceeded expectations', category: 'highlight' },
  { id: 'first-time-builder', label: 'First-time builder', category: 'note' },
  { id: 'resubmission', label: 'Resubmission (improved)', category: 'note' },
]

// Tags for projects that need more work - helps us track common blockers
export const REVISION_TAGS: AuditTag[] = [
  { id: 'demo-broken', label: "Demo didn't load", category: 'needs-work' },
  { id: 'demo-slow', label: 'Demo was too slow to test', category: 'needs-work' },
  { id: 'no-readme', label: 'README needs more detail', category: 'needs-work' },
  { id: 'tutorial-clone', label: 'Looks like a tutorial project', category: 'needs-work' },
  { id: 'missing-ai-disclosure', label: 'Missing AI disclosure', category: 'needs-work' },
  { id: 'incomplete', label: 'Not finished yet', category: 'needs-work' },
  { id: 'cloned-project', label: 'Appears to be a clone/fork', category: 'needs-work' },
  { id: 'wrong-links', label: 'Links were broken', category: 'needs-work' },
  { id: 'private-repo', label: "Repo is private, can't see code", category: 'needs-work' },
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
