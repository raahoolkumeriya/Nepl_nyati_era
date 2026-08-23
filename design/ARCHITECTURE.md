# System Architecture & Technical Diagrams — NEPL Box Cricket

This document contains visual diagrams, interaction models, data flows, and state machines modeling the **NEPL (Nyati Era Premier League)** platform.

---

## 1. System Context Diagram (C4 Level 1)

![System Context Diagram](./images/hld_c4_system_context.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TD
    subgraph Users ["User Personas"]
        SM["👑 Supreme Master<br/>(App Developer / Super User)"]
        SA["⚡ Super Admin<br/>(League Organizer)"]
        AUC["🔨 Auctioneer<br/>(Bidding Operator)"]
        PLY["🏏 Player / Spectator<br/>(Audience)"]
    end

    subgraph Platform ["NEPL Platform Boundary"]
        APP["NEPL Web Application<br/>(React 19 SPA + Express 5 Backend)"]
    end

    subgraph External ["External Infrastructure & Services"]
        MONGO[("MongoDB Atlas<br/>Cloud Database")]
        CH["CricHeroes Platform<br/>(External Stats Link)"]
        RENDER["Render.com<br/>(Cloud Hosting & CDN)"]
    end

    SM -->|"Full administrative control & database reset"| APP
    SA -->|"Manages squads, players, rules & executes sales"| APP
    AUC -->|"Drives live auction bids & counters"| APP
    PLY -->|"Views live auction, stats, squads & rules"| APP

    APP -->|"Persists players, teams, bids & rules"| MONGO
    APP -.->|"Links to external player profile"| CH
    RENDER -->|"Hosts build & serves traffic"| APP
```
</details>

---

## 2. Container Architecture Diagram (C4 Level 2)

![Container Architecture Diagram](./images/arch_c4_container.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TB
    subgraph BrowserClient ["Client Container (Web Browser)"]
        subgraph ReactApp ["React 19 SPA"]
            UIState["React Component State<br/>(useState / useCallback)"]
            LocalCache["LocalStorage Layer<br/>(nepl_teams, nepl_players, nepl_history)"]
            AudioSynth["Web Audio Synthesizer<br/>(Procedural FX: Sine/Saw/Square)"]
            ConfettiEngine["Canvas Confetti FX Engine"]
            APIService["API Client Service (src/services/api.js)"]
        end
    end

    subgraph AppServer ["Backend Web Service (Node.js / Express 5)"]
        subgraph ServerCore ["server/index.js"]
            CORSMw["CORS & JSON Body Parser"]
            AuthKeyMw["verifyApiKey Middleware"]
            
            subgraph Routers ["REST API Routers"]
                RAuth["/api/auth (Auth & RBAC)"]
                RPlayers["/api/players (Player Catalog)"]
                RTeams["/api/teams (Squads & Purses)"]
                RHistory["/api/history (Bid Logs)"]
                RRules["/api/rules (Tournament Rules)"]
            end

            SwaggerDocs["Interactive OpenAPI 3.0<br/>• Swagger UI (/api/docs)<br/>• Redoc (/api/redoc)"]
            SPAFallback["Static Asset Server & SPA Fallback Handler"]
        end
    end

    subgraph CloudDatabase ["Data Container (MongoDB Atlas)"]
        DBColls[("Database: nepl_cricket<br/>• players collection<br/>• teams collection<br/>• bidhistories collection<br/>• rules collection")]
    end

    UIState <--> LocalCache
    UIState --> AudioSynth
    UIState --> ConfettiEngine
    UIState --> APIService

    APIService -->|"REST API / JSON (x-api-key)"| CORSMw
    CORSMw --> AuthKeyMw
    AuthKeyMw --> Routers
    Routers -->|"Mongoose ODM Queries"| DBColls
    ServerCore --> SPAFallback
```
</details>

---

## 3. Component Architecture Diagram (C4 Level 3)

### 3.1 Frontend Component Architecture (`src/`)

![Frontend Component Architecture](./images/arch_frontend_components.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TD
    App["App.jsx (Root Entry)"]
    
    subgraph AuthLayer ["Authentication & State Context"]
        AuthProvider["AuthProvider (AuthContext.jsx)"]
        AuthService["Auth Service (src/services/auth.js)"]
    end

    subgraph HeaderSection ["Header & Global Controls"]
        Header["Header.jsx"]
        SoundToggle["Audio Toggle (SoundFX)"]
        RBACBadge["Role Badge & User Avatar"]
        UserManager["AuctioneerManagerModal.jsx"]
    end

    subgraph CoreViews ["Application Views"]
        AuctionRoom["AuctionRoom.jsx (Live Auction)"]
        TeamsView["TeamsView.jsx (Franchise Squads)"]
        PlayersPool["PlayersPool.jsx (Player Roster)"]
        RulesHub["RulesHub.jsx (Rules Book)"]
        ScheduleStandings["ScheduleStandings.jsx (Points Table)"]
        ProjectorView["ProjectorView.jsx (Big Screen Mode)"]
        LoginPage["LoginPage.jsx (Credential Auth)"]
    end

    subgraph Utilities ["Shared Utilities & Engine"]
        BiddingUtil["bidding.js (Tier Calculation & Slabs)"]
        AudioUtil["audio.js (Web Audio Synthesizer)"]
        APIClient["api.js (REST HTTP Adapter)"]
    end

    App --> AuthProvider
    AuthProvider --> AuthService
    AuthProvider --> Header
    AuthProvider --> CoreViews
    
    Header --> SoundToggle
    Header --> RBACBadge
    Header --> UserManager

    AuctionRoom --> BiddingUtil
    AuctionRoom --> AudioUtil
    AuctionRoom --> APIClient
    
    TeamsView --> APIClient
    PlayersPool --> APIClient
    RulesHub --> APIClient
```
</details>

---

## 4. Entity Relationship Diagram (ERD)

![Entity Relationship Diagram](./images/arch_erd.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
erDiagram
    PLAYER ||--o| TEAM : "is assigned to"
    TEAM ||--o{ SQUAD_PLAYER : "has members"
    PLAYER ||--o{ BID_HISTORY : "subject of"
    TEAM ||--o{ BID_HISTORY : "bids placed by"
    RULE ||--|| TOURNAMENT : "applies to"

    PLAYER {
        string _id PK "MongoDB ObjectId"
        string id UK "Unique player slug / ID"
        string name "Full player name"
        string role "Batsman | Bowler | All-Rounder | Wicket Keeper"
        string category "Icon | Gold | Silver | Bronze | Emerging"
        number basePrice "Initial starting price in PTS"
        number matches "Total matches played"
        number runs "Career runs scored"
        number avg "Batting average"
        number strikeRate "Batting strike rate"
        number wickets "Career wickets taken"
        number economy "Bowling economy rate"
        string status "available | sold | unsold"
        number soldPrice "Final closing bid"
        string soldTo FK "Team ID reference"
        boolean isCaptain "Captain flag"
    }

    TEAM {
        string _id PK "MongoDB ObjectId"
        string id UK "Unique team slug / ID"
        string name "Team franchise name"
        string shortName "Acronym"
        string owner "Team owner name"
        string captainName "Captain display name"
        number totalPurse "Total purse cap (10,000 PTS)"
        number spentPurse "Total amount spent on bids"
        number maxSquadSize "Maximum player limit (8)"
        number playersCount "Current squad count"
        SquadPlayer[] squad "Embedded squad players array"
    }

    SQUAD_PLAYER {
        string id "Player ID"
        string name "Player name"
        string role "Player role"
        number soldPrice "Purchase price"
    }

    BID_HISTORY {
        string id "Unique entry ID"
        string type "SOLD | UNSOLD | BID"
        string playerId FK "Player ID reference"
        string teamId FK "Team ID reference"
        number amount "Bid amount in PTS"
        string timestamp "Time string"
    }

    RULE {
        string id UK "Rule slug / ID"
        string number "Rule serial number"
        string title "Rule heading"
        string desc "Rule body / description"
    }
```
</details>

---

## 5. State Machine Diagrams

### 5.1 Player Auction Lifecycle State Machine

![Player Auction State Machine](./images/arch_state_machine.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
stateDiagram-v2
    [*] --> Available : Initial Roster Import

    Available --> InAuction : Auctioneer Selects Player
    Unsold --> InAuction : Player Brought Back to Table (Round 2)

    state InAuction {
        [*] --> BasePrice : Initialized at basePrice
        BasePrice --> ActiveBidding : First Bid Placed
        ActiveBidding --> ActiveBidding : Higher Bid Placed (+Slab Tier)
        ActiveBidding --> CounterBid : Counter Bid by Competitor Team
        CounterBid --> ActiveBidding
    }

    InAuction --> Sold : Hammer Confirms Sale (Super Admin)
    InAuction --> Unsold : No Bids / Hammer Down (Super Admin)
    
    Sold --> Available : Super Admin / Supreme Master Reverts Sale
    Unsold --> Available : Super Admin Resets Player

    Sold --> [*] : Auction Complete
```
</details>

---

## 6. Sequence Diagrams

### 6.1 Authentication & Session Flow

![Authentication Sequence Diagram](./images/arch_seq_auth.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Admin / Auctioneer / Player)
    participant LoginUI as LoginPage.jsx
    participant AuthCtx as AuthContext.jsx
    participant API as Express /api/auth
    participant Env as Server Environment (process.env)

    User->>LoginUI: Enters Email & Password
    LoginUI->>AuthCtx: login(email, password)
    AuthCtx->>API: POST /api/auth/login { email, password }
    API->>Env: Compare with SUPREMEMASTER / SUPERUSER / AUCTIONEER credentials
    
    alt Credentials Valid
        API-->>AuthCtx: 200 OK { success: true, user: { id, email, role, name, avatar } }
        AuthCtx->>AuthCtx: createSession(user) (localStorage: nepl_auth_session)
        AuthCtx-->>LoginUI: Session Active
        LoginUI-->>User: Renders Authenticated App with RBAC privileges
    else Invalid Credentials
        API-->>AuthCtx: 401 Unauthorized { error: "Invalid email or password" }
        AuthCtx-->>LoginUI: Throws Error
        LoginUI-->>User: Displays Error Alert Message
    end
```
</details>

### 6.2 Live Bid Placement & Dynamic Slab Validation

![Live Bidding Sequence Diagram](./images/arch_seq_bidding.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor Operator as 🔨 Auctioneer / ⚡ Super Admin
    participant UI as AuctionRoom.jsx
    participant BiddingUtil as bidding.js
    participant Sound as audio.js (Web Audio)
    participant State as React State (App.jsx)
    participant Local as localStorage

    Operator->>UI: Clicks "+ Bid" or Team Quick-Bid Button
    UI->>BiddingUtil: getBidIncrement(currentBid)
    BiddingUtil-->>UI: Returns increment (+100, +200, +300, etc.)
    UI->>UI: Check Constraints (Purse, Squad Capacity, High Bidder)

    alt Constraints Pass
        UI->>Sound: soundFx.playBid()
        UI->>State: setCurrentBid(newBid), setHighBidder(team)
        State->>Local: Sync local state snapshot
    else Constraint Violation
        UI-->>Operator: Display warning toast (e.g. "Exceeds Team Purse!")
    end
```
</details>

### 6.3 Player SOLD Hammer Down & Squad Assignment

![Player Sold Sequence Diagram](./images/arch_seq_sold.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as ⚡ Super Admin
    participant UI as AuctionRoom.jsx
    participant Confetti as canvas-confetti
    participant Sound as audio.js
    participant State as App State
    participant Sync as Debounced API Sync
    participant DB as MongoDB Atlas

    SuperAdmin->>UI: Clicks "SOLD" (Hammer Down)
    UI->>Sound: soundFx.playSold() & soundFx.playHammer()
    UI->>Confetti: Trigger full-screen victory confetti burst
    
    UI->>State: Update Player: status='sold', soldPrice=currentBid, soldTo=highBidder.id
    UI->>State: Update Team: spentPurse += currentBid, squad.push(player)
    UI->>State: Append to History: { type: 'SOLD', player, team, amount: currentBid }
    
    State->>Sync: Trigger 500ms Debounce Save
    Sync->>DB: PUT /api/players & PUT /api/teams
    DB-->>Sync: Write Acknowledged (200 OK)
```
</details>

---

## 7. Deployment Topology & Network Architecture

![Deployment Topology Diagram](./images/hld_deployment_topology.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TB
    subgraph Clients ["Client Devices"]
        D1["Admin Laptop (Chrome)"]
        D2["Auctioneer Tablet (iPad / Safari)"]
        D3["Big Screen TV / Projector (Full-Screen View)"]
        D4["Audience Mobile Phones (4G/5G/WiFi)"]
    end

    subgraph Edge ["Render.com Cloud Edge Network"]
        CDN["Render Global Edge / Cloudflare CDN"]
        SSL["TLS 1.3 Termination & DDoS Shield"]
    end

    subgraph Service ["Render Compute Instance"]
        NodeCluster["Node.js 20+ Runtime (Express 5 Service)"]
        StaticBundle["Vite Production Distribution (/dist)"]
        ExpressApp["Express API Endpoints (/api/*)"]
        APIDocumentation["Swagger UI & Redoc OpenAPI Engine"]
    end

    subgraph DatabaseCloud ["MongoDB Atlas Cloud (M0 / M10 Dedicated)"]
        ReplicaPrimary[("Primary Data Node (Write Master)")]
        ReplicaSecondary1[("Secondary Data Node (Read Replica)")]
        ReplicaSecondary2[("Secondary Data Node (Read Replica)")]
    end

    D1 & D2 & D3 & D4 -->|"HTTPS / Port 443"| CDN
    CDN --> SSL
    SSL --> NodeCluster
    NodeCluster --> StaticBundle
    NodeCluster --> ExpressApp
    NodeCluster --> APIDocumentation
    
    ExpressApp -->|"Mongoose TLS (mongodb+srv://)"| ReplicaPrimary
    ReplicaPrimary -.->|"Oplog Sync"| ReplicaSecondary1
    ReplicaPrimary -.->|"Oplog Sync"| ReplicaSecondary2
```
</details>
