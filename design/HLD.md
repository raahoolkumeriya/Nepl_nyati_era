# High-Level Design (HLD) — NEPL Box Cricket Platform

## 1. Executive Summary & Objectives

The **Nyati Era Premier League (NEPL)** application is an auction and league operations platform designed for managing box cricket tournaments. It provides a real-time, responsive interface for auctioneers, franchise owners, team captains, players, and spectators to participate in and view live player bidding, team budget allocations, player profile evaluations, tournament standings, and tournament regulations.

### Key Objectives
1. **Zero-Latency Live Auction:** Provide an interactive bidding console with automatic budget enforcement, dynamic bid increment tiers, and immediate visual/audio feedback.
2. **Multi-Role Governance:** Strict role segregation ensuring only authorized personnel (Auctioneer, Super Admin, Supreme Master) can alter state, while players and spectators enjoy read-only transparency.
3. **High-Impact Presentation:** Dedicated "Projector / TV Mode" allowing live streaming/casting onto large screens during the auction gala.
4. **Resilient Data Architecture:** Seamless dual-persistence ensuring zero data loss during network hiccups using local client-side state combined with debounced synchronization to cloud-hosted MongoDB Atlas.

---

## 2. System Context (C4 Model — Level 1)

The system context diagram illustrates how different user personas and external services interact with the NEPL platform.

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

## 3. Container Architecture (C4 Model — Level 2)

The system is architected as a lightweight, modern full-stack application comprising a single-page frontend, a stateless REST API layer, and a cloud document store.

![Container Architecture Diagram](./images/hld_c4_container.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph LR
    subgraph Client ["Client Tier (Browser)"]
        SPA["React 19 SPA<br/>(Vite, Tailwind CSS, Lucide)<br/>• Local State & LocalStorage Cache<br/>• Web Audio FX Synth<br/>• Projector View Engine"]
    end

    subgraph Backend ["Application Server (Node.js)"]
        API["Express 5 REST API<br/>(ES Modules)<br/>• API Key Middleware (/api/*)<br/>• Auth & Role Guard<br/>• Entity Routers (/players, /teams, /history, /rules)<br/>• OpenAPI 3.0 (Swagger UI & Redoc)"]
    end

    subgraph Database ["Data Tier"]
        DB[("MongoDB Atlas<br/>• DB: nepl_cricket<br/>• Collections: players, teams, bidhistories, rules")]
    end

    SPA -->|"HTTP REST / JSON (x-api-key, Bearer Auth)"| API
    API -->|"Mongoose ODM (TLS / Connection Pool)"| DB
```
</details>

---

## 4. Architectural Patterns & Principles

1. **Layered Decoupled Architecture:** Separation of Presentation (React SPA), API & Orchestration (Express.js), and Persistence (MongoDB + Mongoose).
2. **Optimistic UI with Background Reconciliation:** User actions (bids, sold marks) immediately update the local React state and `localStorage` to eliminate perceived UI lag, while asynchronous debounced HTTP requests commit the changes to MongoDB.
3. **Stateless API Gateway Pattern:** Express server maintains zero in-memory session state, allowing seamless scaling and server restarts without interrupting client interactions.
4. **Environment-Driven Configuration & Defense-in-Depth:** Credentials, MongoDB URIs, and API keys are strictly configured via environment variables. Mutating REST API endpoints are guarded by `verifyApiKey` middleware.
5. **No External Asset Dependency for Audio:** Audio synthesis utilizes the browser's native **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`) rather than external MP3/WAV files, ensuring offline reliability and zero loading latency.

---

## 5. Role-Based Access Control (RBAC) Architecture

The platform implements a fine-grained 4-tier RBAC system:

![RBAC Hierarchy](./images/hld_rbac_hierarchy.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TD
    subgraph RBAC_Tiers ["RBAC Privilege Hierarchy"]
        T1["👑 Supreme Master<br/>(Developer / Root Admin)"]
        T2["⚡ Super Admin<br/>(Tournament Organizer)"]
        T3["🔨 Auctioneer<br/>(Auction Desk Officer)"]
        T4["🏏 Player / Viewer<br/>(Community Member)"]
    end

    T1 -->|Super-set of System Permissions| T2
    T2 -->|Super-set of Auction Operations| T3
    T3 -->|Super-set of Read Operations| T4
```
</details>

### Role Permissions Matrix

| Permission Key | Supreme Master (`suprememaster`) | Super Admin (`superuser`) | Auctioneer (`auctioneer`) | Player (`player`) |
|---|:---:|:---:|:---:|:---:|
| `canViewAuction` | ✅ | ✅ | ✅ | ✅ |
| `canViewTeams` | ✅ | ✅ | ✅ | ✅ |
| `canViewPlayers` | ✅ | ✅ | ✅ | ✅ |
| `canViewRules` | ✅ | ✅ | ✅ | ✅ |
| `canViewSchedule` | ✅ | ✅ | ✅ | ✅ |
| `canAccessProjector` | ✅ | ✅ | ✅ | ✅ |
| `canBid` | ❌ *(Audit mode)* | ✅ | ✅ | ❌ |
| `canSellPlayer` | ❌ | ✅ | ❌ *(Escalate to Admin)* | ❌ |
| `canUnsellPlayer` | ❌ | ✅ | ❌ | ❌ |
| `canOverrideBid` | ❌ | ✅ | ❌ | ❌ |
| `canEditPlayers` | ❌ | ✅ | ❌ | ❌ |
| `canAddPlayers` | ❌ | ✅ | ❌ | ❌ |
| `canDeletePlayers` | ❌ | ✅ | ❌ | ❌ |
| `canManageTeams` | ❌ | ✅ | ❌ | ❌ |
| `canManageUsers` | ✅ | ✅ | ❌ | ❌ |
| `canResetData` | ✅ *(Exclusive)* | ❌ | ❌ | ❌ |

---

## 6. Core Business Workflows

### 6.1 Live Auction Lifecycle

![Live Auction Lifecycle](./images/hld_auction_lifecycle.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor Admin as ⚡ Super Admin / 🔨 Auctioneer
    participant UI as React Auction Console
    participant Audio as Web Audio Synth
    participant API as Express API (/api/*)
    participant DB as MongoDB Atlas

    Admin->>UI: Select Player for Bidding
    UI->>UI: Initialize Bid at Player Base Price
    
    loop Bidding Rounds
        Admin->>UI: Place Bid for Franchise Team (e.g. +200 PTS)
        UI->>UI: Validate Purse (spentPurse + bid <= totalPurse)
        UI->>UI: Validate Squad Capacity (squad.length < maxSquadSize)
        UI->>Audio: playBid() (High-pitch chime)
        UI->>UI: Update highBidder and currentBid
    end

    alt Final Hammer - SOLD
        Admin->>UI: Confirm Player SOLD
        UI->>Audio: playSold() (Victory Chord) & playHammer()
        UI->>UI: Trigger canvas-confetti burst
        UI->>UI: Move Player to Team Squad & Update spentPurse
        UI->>API: PUT /api/players (Debounced / Instant)
        UI->>API: PUT /api/teams (Debounced / Instant)
        UI->>API: POST /api/history (Bid record)
        API->>DB: Persist mutations in MongoDB collections
    else Unsold - UNSOLD
        Admin->>UI: Mark Player UNSOLD
        UI->>Audio: playUnsold() (Descending buzzer) & playHammer()
        UI->>UI: Mark player status = 'unsold'
        UI->>API: PUT /api/players
        API->>DB: Persist in MongoDB
    end
```
</details>

### 6.2 Bidding Increment Slabs (Dynamic Engine)

The system automatically scales the mandatory bid step based on the current bid value to accelerate auction velocity while maintaining fairness:

| Current Bid Range (PTS) | Minimum Increment | Tier Label |
|---|---|---|
| **0 – 999** | **+100 PTS** | Tier 1 (Base) |
| **1,000 – 2,999** | **+200 PTS** | Tier 2 (Mid) |
| **3,000 – 4,999** | **+300 PTS** | Tier 3 (High) |
| **5,000 – 6,999** | **+400 PTS** | Tier 4 (Premium) |
| **≥ 7,000** | **+100 PTS per 2,000 PTS slab** | Tier N (Elite) |

---

## 7. Data Architecture & Schema Overview

The database contains 4 primary collections inside the `nepl_cricket` database:

![Entity Relationship Diagram](./images/hld_erd.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
erDiagram
    PLAYER ||--o| TEAM : "sold to"
    TEAM ||--o{ SQUAD_PLAYER : "contains"
    PLAYER ||--o{ BID_HISTORY : "auction records"
    TEAM ||--o{ BID_HISTORY : "bids placed by"
    RULE ||--|| TOURNAMENT : "governs"

    PLAYER {
        string id PK
        string name
        string role
        string category
        number basePrice
        number runs
        number wickets
        number avg
        number strikeRate
        number economy
        string status
        number soldPrice
        string soldTo FK
        boolean isCaptain
    }

    TEAM {
        string id PK
        string name
        string shortName
        string owner
        string captainId FK
        string captainName
        number totalPurse
        number spentPurse
        number maxSquadSize
        number playersCount
        string color
        string gradient
    }

    BID_HISTORY {
        string id PK
        string type
        string playerId FK
        string playerName
        string teamId FK
        string teamName
        string teamColor
        number amount
        string timestamp
    }

    RULE {
        string id PK
        string number
        string title
        string desc
        string icon
    }
```
</details>

---

## 8. Deployment & Network Topology

The production setup uses **Render.com** and **MongoDB Atlas Cloud**:

![Deployment Topology](./images/hld_deployment_topology.svg)

<details>
<summary><b>View Mermaid Source</b></summary>

```mermaid
graph TB
    subgraph Internet ["Public Internet"]
        ClientBrowser["End Users (Chrome, Safari, Mobile, TV Projectors)"]
    end

    subgraph RenderPlatform ["Render.com Cloud Environment"]
        LB["Render Load Balancer / SSL Terminator (HTTPS :443)"]
        subgraph WebService ["Express Web Service (Node.js)"]
            StaticContent["Static Assets (dist/ index.html, JS, CSS)"]
            APIEndpoints["REST API (/api/players, /api/teams, /api/auth, /api/docs)"]
        end
    end

    subgraph MongoAtlas ["MongoDB Atlas Cluster (GCP / AWS / Azure)"]
        Primary["Primary Replica Node"]
        Secondary1["Secondary Replica Node 1"]
        Secondary2["Secondary Replica Node 2"]
    end

    ClientBrowser -->|"HTTPS / WSS"| LB
    LB --> StaticContent
    LB --> APIEndpoints
    APIEndpoints -->|"Mongoose TLS SRV Connection (Port 27017)"| Primary
    Primary -.->|"Replication"| Secondary1
    Primary -.->|"Replication"| Secondary2
```
</details>

---

## 9. Non-Functional Requirements (NFRs)

| Metric / Dimension | Target / Strategy | Implementation Details |
|---|---|---|
| **Latency & Responsiveness** | < 50ms UI update | Optimistic state update in React; background debounced MongoDB persistence (500ms delay). |
| **Availability** | 99.9% uptime | Hosted on Render auto-restarting Web Services backed by multi-AZ MongoDB Atlas replica set. |
| **Security** | Zero credential leak | Authentication verification executed on server; passwords never included in client bundle. Mutating routes guarded by `x-api-key`. |
| **Offline Resilience** | Full offline auction continuity | State automatically synchronized to `localStorage`. If server or internet disconnects, auction continues uninterrupted. |
| **Compatibility** | All modern browsers & TV WebViews | Responsive Tailwind CSS layouts, full support for Desktop, Tablet, Mobile, and Big-Screen Projectors. |
| **Developer Ergonomics** | Self-documenting API | Interactive Swagger UI (`/api/docs`) and Redoc 3-column viewer (`/api/redoc`) generated directly from OpenAPI 3.0 specification. |
