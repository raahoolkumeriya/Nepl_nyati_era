export const DEFAULT_AVATARS = {
  male: '/avatars/male.png',
  female: '/avatars/female.png',
  master: '/avatars/master.png',
  super_master: '/avatars/super_master.png',
};

export const TOURNAMENT_RULES = [
  {
    id: 'rule-1',
    number: '01',
    title: 'Round Robin League Format',
    desc: 'Every participating team gets 5 league matches in a round robin format to ensure equal playing opportunities.',
    icon: 'Trophy'
  },
  {
    id: 'rule-2',
    number: '02',
    title: 'Auction Player Selection & Bidding Slabs',
    desc: 'All players are selected through a live auction using team purse budget. Bidding increments follow tiered slabs: +100 PTS up to 1,000 PTS, +200 PTS between 1,000 to 3,000 PTS, and +300 PTS above 3,000 PTS (+100 for every additional 2,000 PTS crossing).',
    icon: 'Gavel'
  },
  {
    id: 'rule-3',
    number: '03',
    title: '8 Overs Innings Limit',
    desc: 'Each innings consists of exactly 8 overs. Bowlers have per-over quotas to maintain match pace.',
    icon: 'Clock'
  },
  {
    id: 'rule-4',
    number: '04',
    title: '8 Players Squad | Max 6 On Field',
    desc: 'Each team comprises an 8-player squad. However, at ANY given time, strictly ONLY 6 players are allowed on the ground. Captains MUST rotate players so everyone gets playing time.',
    icon: 'Users'
  },
  {
    id: 'rule-5',
    number: '05',
    title: 'NEPL Fence Boundary Rule',
    desc: 'Official NEPL fence boundary rules apply. A ball hitting the fence directly earns 1 run / 2 runs as a bonus based on marked fence zones.',
    icon: 'ShieldAlert'
  },
  {
    id: 'rule-6',
    number: '06',
    title: '7 Wickets Out = Innings Complete',
    desc: 'NO last man batting is allowed. Once 7 wickets fall, the innings is officially completed.',
    icon: 'XCircle'
  },
  {
    id: 'rule-7',
    number: '07',
    title: 'Playoff & Qualifier System',
    desc: 'The Table Topper (either by points or NRR) qualifies directly for the Finals! 2nd and 3rd place play the Semifinal match. The winner advances to the Finals.',
    icon: 'Zap'
  },
  {
    id: 'rule-8',
    number: '08',
    title: 'Umpire Decisions & Arbitration',
    desc: 'Umpiring decisions are strictly FINAL. No on-ground disputes will be entertained. For any major arguments, the FINAL decision will be held by Harish & Santosh.',
    icon: 'UserCheck'
  },
  {
    id: 'rule-9',
    number: '09',
    title: 'Prize Money',
    desc: 'WINNER: INR 2,500/- | RUNNER UP: INR 1,500/-',
    icon: 'Gift'
  },
  {
    id: 'rule-10',
    number: '10',
    title: 'Rain Policy & Weekend Schedule',
    desc: 'If matches are interrupted due to rain or unforeseen reasons, the schedule will be adjusted dynamically. If Saturday evening is clear, Sunday morning matches will be shifted to the Saturday RAIN COVER slot. Finals target Sunday 8 PM finish, followed by a grand Dinner Party!',
    icon: 'CloudRain'
  }
];
