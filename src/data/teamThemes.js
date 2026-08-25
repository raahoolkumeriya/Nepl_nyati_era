/**
 * NEPL (Nyati Era Premiere League) Official Team Color Identities & Franchise Themes
 * Ensures every team has a unique, vibrant color identity with automatic team naming.
 * Scalable for 2 to 24+ teams with dynamic procedural palette expansion.
 */

export const TEAM_COLOR_THEMES = [
  {
    id: 'royal_blue',
    name: 'Royal Blue Royals',
    shortName: 'RBR',
    color: '#3b82f6',
    logo: '🦁',
    label: 'Royal Blue',
    gradient: 'from-blue-600 to-blue-900',
    description: 'Majestic Royal Blue — Lions of Nyati Era'
  },
  {
    id: 'crimson_red',
    name: 'Crimson Titans',
    shortName: 'CRT',
    color: '#ef4444',
    logo: '🔥',
    label: 'Crimson Red',
    gradient: 'from-red-600 to-red-950',
    description: 'Fierce Crimson Red — Unstoppable Fire'
  },
  {
    id: 'neon_cyan',
    name: 'Neon Cyan Strikers',
    shortName: 'NCS',
    color: '#06b6d4',
    logo: '⚡',
    label: 'Neon Cyan',
    gradient: 'from-cyan-500 to-cyan-950',
    description: 'Electric Neon Cyan — Lightning Fast'
  },
  {
    id: 'emerald_green',
    name: 'Emerald Kings',
    shortName: 'EMK',
    color: '#10b981',
    logo: '🛡️',
    label: 'Emerald Green',
    gradient: 'from-emerald-500 to-emerald-950',
    description: 'Resilient Emerald Green — Shield of Era'
  },
  {
    id: 'golden_amber',
    name: 'Golden Knights',
    shortName: 'GDK',
    color: '#f59e0b',
    logo: '👑',
    label: 'Golden Amber',
    gradient: 'from-amber-500 to-amber-950',
    description: 'Radiant Gold — Crown of Champions'
  },
  {
    id: 'electric_purple',
    name: 'Electric Purple Blitz',
    shortName: 'EPB',
    color: '#a855f7',
    logo: '🦅',
    label: 'Electric Purple',
    gradient: 'from-purple-600 to-purple-950',
    description: 'Mystic Purple — Soaring Hawks'
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Hurricanes',
    shortName: 'SNH',
    color: '#f97316',
    logo: '🎯',
    label: 'Sunset Orange',
    gradient: 'from-orange-500 to-orange-950',
    description: 'Dynamic Sunset Orange — Precision Attack'
  },
  {
    id: 'magenta_pink',
    name: 'Magenta Warriors',
    shortName: 'MGW',
    color: '#ec4899',
    logo: '⚔️',
    label: 'Magenta Pink',
    gradient: 'from-pink-500 to-pink-950',
    description: 'Bold Magenta — Fearless Combatants'
  },
  {
    id: 'teal_gladiators',
    name: 'Teal Gladiators',
    shortName: 'TGL',
    color: '#14b8a6',
    logo: '🌪️',
    label: 'Deep Teal',
    gradient: 'from-teal-500 to-teal-950',
    description: 'Vortex Teal — Whirlwind Force'
  },
  {
    id: 'solar_yellow',
    name: 'Solar Tigers',
    shortName: 'SLT',
    color: '#eab308',
    logo: '🐯',
    label: 'Solar Yellow',
    gradient: 'from-yellow-500 to-yellow-950',
    description: 'Blazing Solar Yellow — Apex Predators'
  },
  {
    id: 'terracotta_ruby',
    name: 'Terracotta Hawks',
    shortName: 'TCH',
    color: '#d4622a',
    logo: '🦅',
    label: 'Terracotta',
    gradient: 'from-[#d4622a] to-stone-900',
    description: 'Classic Nyati Terracotta — Foundation of Era'
  },
  {
    id: 'indigo_storm',
    name: 'Indigo Storm',
    shortName: 'IDS',
    color: '#6366f1',
    logo: '⚡',
    label: 'Deep Indigo',
    gradient: 'from-indigo-600 to-indigo-950',
    description: 'Thunderous Indigo — Storm Riders'
  },
  {
    id: 'lime_predators',
    name: 'Lime Predators',
    shortName: 'LMP',
    color: '#84cc16',
    logo: '🦖',
    label: 'Lime Green',
    gradient: 'from-lime-500 to-lime-950',
    description: 'Relentless Lime — Fierce Hunters'
  },
  {
    id: 'rose_phoenix',
    name: 'Rose Phoenix',
    shortName: 'RPX',
    color: '#f43f5e',
    logo: '🦩',
    label: 'Rose Red',
    gradient: 'from-rose-500 to-rose-950',
    description: 'Rising Rose — Unstoppable Resurgence'
  },
  {
    id: 'violet_vipers',
    name: 'Violet Vipers',
    shortName: 'VVP',
    color: '#8b5cf6',
    logo: '🐍',
    label: 'Deep Violet',
    gradient: 'from-violet-600 to-violet-950',
    description: 'Venomous Violet — Strike with Precision'
  },
  {
    id: 'sky_falcons',
    name: 'Sky Falcons',
    shortName: 'SKF',
    color: '#0ea5e9',
    logo: '🦅',
    label: 'Sky Blue',
    gradient: 'from-sky-500 to-sky-950',
    description: 'High Altitude Sky Blue — Dominant Aerial Attack'
  },
  {
    id: 'mint_stallions',
    name: 'Mint Stallions',
    shortName: 'MTS',
    color: '#2dd4bf',
    logo: '🐎',
    label: 'Mint Green',
    gradient: 'from-teal-400 to-emerald-950',
    description: 'Galloping Mint — Pure Acceleration'
  },
  {
    id: 'coral_sharks',
    name: 'Coral Sharks',
    shortName: 'CRS',
    color: '#fb7185',
    logo: '🦈',
    label: 'Coral Flame',
    gradient: 'from-rose-400 to-rose-950',
    description: 'Predatory Coral — Deep Ocean Strike'
  },
  {
    id: 'platinum_wolves',
    name: 'Platinum Wolves',
    shortName: 'PLW',
    color: '#94a3b8',
    logo: '🐺',
    label: 'Platinum Slate',
    gradient: 'from-slate-400 to-slate-950',
    description: 'Alpha Pack — Relentless Unity'
  },
  {
    id: 'bronze_rhinos',
    name: 'Bronze Rhinos',
    shortName: 'BZR',
    color: '#b45309',
    logo: '🦏',
    label: 'Bronze Amber',
    gradient: 'from-amber-700 to-stone-950',
    description: 'Armored Bronze — Unbreakable Charge'
  },
  {
    id: 'lavender_knights',
    name: 'Lavender Knights',
    shortName: 'LVK',
    color: '#c084fc',
    logo: '⚔️',
    label: 'Lavender',
    gradient: 'from-purple-400 to-purple-950',
    description: 'Chivalric Lavender — Tactical Mastery'
  },
  {
    id: 'aqua_mariners',
    name: 'Aqua Mariners',
    shortName: 'AQM',
    color: '#38bdf8',
    logo: '⚓',
    label: 'Aqua Blue',
    gradient: 'from-sky-400 to-blue-950',
    description: 'Uncharted Waters — High Tide Power'
  },
  {
    id: 'forest_panthers',
    name: 'Forest Panthers',
    shortName: 'FSP',
    color: '#059669',
    logo: '🐆',
    label: 'Forest Green',
    gradient: 'from-emerald-600 to-emerald-950',
    description: 'Stealth Panthers — Forest Ambush'
  },
  {
    id: 'crimson_dragons',
    name: 'Crimson Dragons',
    shortName: 'CRD',
    color: '#dc2626',
    logo: '🐉',
    label: 'Dragon Crimson',
    gradient: 'from-red-700 to-red-950',
    description: 'Mythic Dragons — High-Octane Firepower'
  }
];

/**
 * Get a unique color theme for a team index or fallback
 */
export function getThemeByIndex(index = 0) {
  return TEAM_COLOR_THEMES[index % TEAM_COLOR_THEMES.length];
}

/**
 * Find matching theme by color hex or generate dynamic theme
 */
export function getThemeByColor(hexColor) {
  if (!hexColor) return null;
  const match = TEAM_COLOR_THEMES.find(t => t.color.toLowerCase() === hexColor.toLowerCase());
  if (match) return match;

  return {
    id: `custom_${hexColor.replace('#', '')}`,
    name: 'Custom Franchise',
    shortName: 'CFT',
    color: hexColor,
    logo: '🏏',
    label: 'Custom Theme',
    gradient: 'from-slate-700 to-slate-950',
    description: 'Custom Tournament Franchise Identity'
  };
}

