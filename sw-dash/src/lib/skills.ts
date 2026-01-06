export const SKILLS = [
  'CLI',
  'Cargo',
  'Web App',
  'Chat Bot',
  'Extension',
  'Desktop App (Windows)',
  'Desktop App (Linux)',
  'Desktop App (macOS)',
  'Minecraft Mods',
  'Hardware',
  'Android App',
  'iOS App',
  'Steam Games',
  'PyPI',
] as const

export type Skill = (typeof SKILLS)[number]

export function isValidSkill(skill: string): skill is Skill {
  return SKILLS.includes(skill as Skill)
}

export function badSkills(skills: string[]): string[] {
  return skills.filter((s) => !isValidSkill(s))
}
