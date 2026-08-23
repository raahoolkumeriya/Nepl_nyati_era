/**
 * NEPL (Nyati Era Premiere League) 2026 Summer Season Official Rules & Format Specification
 * Extracted and compiled from official NEPL-2026-Summer-Seasons-Rules.docx
 */

export const NEFL_2026_RAW_RULES_TEXT = `
NEPL 2026 Summer Season Rules (NEPL - Nyati Era Premiere League Format)

1. Team Composition:
10 teams have been formed with 12 members in each team depending on how many players have been allotted in each category. A standard team will have 1 Super Master, 1 Master, 3 Female Players and 7 Male Players.
Each game we will have 12 overs for an inning: 5 overs for Privileges + 7 overs for General.

2. Batting/Bowling Rules:
- First 5 overs are allocated to Privilege category:
  * Super Master: 1 Over
  * Master: 1 Over
  * Females: 3 Overs
- Strike rotation on any wicket for Female Category: Circular order F1 -> F2 -> F3 -> F1...
  F1/F2 will be opening pair. If F1 gets out then F2 takes strike and F3 joins at non-striker end. If F2 gets out, F3 takes strike and F1 joins at non-striker end. Once out, player exits ground and rejoins at non-striker end on next rotation.
- Next 7 overs are allocated for general category (Male players).
- Each player competes against their counterpart from the opposing team within the same category.
- No challenge over / magic over.
- The use of excessive speed is prohibited. If considered too fast, umpire may declare No Ball.
- Above waist full toss, over stepping, excessive pace, and fielding constraint violations are No Balls.
- No concept of Free Hit for No Ball.
- Byes and overthrows are permitted in all categories.
- Dead runner rules for Super Masters and Masters: if dead runner leaves crease before ball is bowled, warning issued; repeated offense requires replacing dead runner.
- Multi-bounce (>1 bounce reaching batting crease) is treated as a Dead Ball (not a no-ball, no runs awarded). Pitch uneven bounce is also a dead ball.
- Last player allowed with dead runner. Once 7th General Category batsman is out, inning is over.

3. Fence & Zone Scoring Rules:
- Bonus runs for hitting the balls directly to either side of the fences:
  * 1 run: Starting point of the Net to the Pole situated parallel to bowling crease.
  * 2 runs: Bowling crease Pole to Boundary lines.
  * Any scoring done by running with these bonus hits adds to additional runs (possibilities: 1, 2, 3, 4, 6 runs).
  * While taking a catch, if fielder touches bonus net area, striker is NOT OUT and bonus + running runs are awarded.
  * 4 runs: Touching straight net boundary indirectly.
  * 6 runs: Touching straight net boundary directly.
  * Only wooden bats allowed (Mini masters can use plastic bat).

4. Fielding Rules:
- Maximum 2 fielders behind the bowling crease and maximum 2 fielders before the bowling crease (excluding bowler and wicketkeeper).
- Presence of wicketkeeper is mandatory.
- General category overs: Maximum 6 players allowed to field at any time adhering to restrictions (from 7 squad players; bowling team rotates fielders on the go).
- No fielding substitutes provided.
- Masters recommended to field on the off-side.
- Male-category player may keep wickets during privilege-category overs but is not permitted to field in any other position during those overs.

5. Deficiency Rule & Bonus Runs:
- Assigned backup players participate as regular players. If shortfall remains:
- Opposition bonus runs in case of privilege category shortage:
  * Super Master shortage: 6 runs per over to opponent
  * Master shortage: 7 runs per over to opponent
  * Female shortage: 6 runs per over to opponent
- Dual Deficiency (both teams short): e.g., if 0 females in both teams, bonus of 18 runs (3 * 6) given to both teams and remaining 9 overs played.
- Minimum participation requirement: At least 2 privilege players and 3 general players present; otherwise match is forfeited.

6. Umpiring & Review:
- Main Umpire & Leg-Side Umpire (calls pace, run outs, bonus runs). Decisions are strictly final. No review system.

7. Points System & Knockouts:
- Round robin: 4 league games per team. Win = 2 pts, Tie = 1 pt each.
- Top 2 from Group A & Group B qualify for Knockouts (Points + NRR).
- Semifinal 1: Group A 1st vs Group B 2nd.
- Semifinal 2: Group B 1st vs Group A 2nd.
- Final: Winner SF1 vs Winner SF2.
- Knockout Tie: Super Over for male players (3 batsmen, 2 wickets).

8. Punctuality, Injury & Ground Conduct:
- Report 15 minutes before match. Late arrival after 1st ball at opponent captain discretion.
- Injured runner must belong to same category.
- Abusive language prohibited. Only wicketkeeper male allowed inside court during privilege overs.
`;

export const NEFL_FORMAT_DETAILS = {
  title: "NEPL (Nyati Era Premiere League) 2026 Summer Season Official Format",
  subtitle: "12 Overs Match Structure · 5 Privilege + 7 General Overs · 12-Member Squads",
  squadComposition: {
    totalSquad: 12,
    superMaster: 1,
    master: 1,
    female: 3,
    maleGeneral: 7,
    maxOnField: 6,
  },
  matchStructure: [
    {
      segment: "Privilege Category",
      overs: 5,
      breakdown: [
        { category: "Super Master", overs: 1, desc: "Dedicated 1-over segment against counterpart" },
        { category: "Master", overs: 1, desc: "Dedicated 1-over segment (recommended off-side fielding)" },
        { category: "Female", overs: 3, desc: "Circular strike rotation (F1 -> F2 -> F3 -> F1)" },
      ],
      fieldingNote: "Male players can ONLY keep wickets during privilege overs; no outfielding allowed."
    },
    {
      segment: "General Category",
      overs: 7,
      breakdown: [
        { category: "Male Players", overs: 7, desc: "1 over per bowler/batter counterpart match-up" }
      ],
      fieldingNote: "Max 6 players on field from 7-man squad (freely rotated on the go)."
    }
  ],
  fenceBonusScoring: [
    { zone: "Net Start to Bowling Crease Pole", bonus: "+1 Run", type: "Side Net Direct Hit", notes: "Running runs added to bonus" },
    { zone: "Bowling Crease Pole to Boundary Line", bonus: "+2 Runs", type: "Side Net Direct Hit", notes: "Running runs added to bonus" },
    { zone: "Straight Net Boundary (Indirect)", bonus: "4 Runs", type: "Ground/Bounce Hit", notes: "Standard 4" },
    { zone: "Straight Net Boundary (Direct)", bonus: "6 Runs", type: "Direct Aerial Hit", notes: "Standard 6" },
    { zone: "Bonus Area Fence Catch Contact", bonus: "Not Out", type: "Fielder Touch", notes: "Striker Not Out + bonus runs + running awarded" }
  ],
  fieldingRestrictions: {
    maxBehindCrease: 2,
    maxBeforeCrease: 2,
    keeperMandatory: true,
    penalty: "No Ball",
    combinations: [
      { playersAvailable: 6, behindBefore: "2 - 2" },
      { playersAvailable: 5, behindBefore: "2 - 1 or 1 - 2" },
      { playersAvailable: 4, behindBefore: "1 - 1, 2 - 0, or 0 - 2" },
      { playersAvailable: 3, behindBefore: "1 - 0 or 0 - 1" }
    ]
  },
  deficiencyRules: {
    superMasterShortage: 6, // runs per over
    masterShortage: 7,      // runs per over
    femaleShortage: 6,      // runs per over
    minPrivilegeRequired: 2,
    minGeneralRequired: 3,
    scenarios: [
      { teamA: 0, teamB: 0, teamABonus: 18, teamBBonus: 18, desc: "Both teams missing all 3 females" },
      { teamA: 0, teamB: 1, teamABonus: 0, teamBBonus: 18, desc: "Team A has 0, Team B has 1 (Team B entitled to play/bonus)" },
      { teamA: 0, teamB: 2, teamABonus: 0, teamBBonus: 18, desc: "Team A has 0, Team B has 2" },
      { teamA: 0, teamB: 3, teamABonus: 0, teamBBonus: 18, desc: "Team A has 0, Team B has 3" },
      { teamA: 1, teamB: 1, teamABonus: 0, teamBBonus: 0, desc: "Both teams have at least 1 female player" },
      { teamA: 1, teamB: 2, teamABonus: 0, teamBBonus: 0, desc: "Both teams have represented category" }
    ]
  },
  knockoutRules: {
    leagueFormat: "4 League Matches per team in Round Robin",
    pointsWin: 2,
    pointsTie: 1,
    qualification: "Top 2 from Group A & Group B (Points + NRR)",
    superOver: "Male players super over on tie (3 batsmen, 2 wickets). 2nd batting team bats first in Super Over."
  }
};
