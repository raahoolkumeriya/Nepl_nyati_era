import base64
import os
import urllib.request
import time

DIAGRAMS = {
    # ── HLD Diagrams ────────────────────────────────────────────────────────
    "hld_c4_system_context.svg": """
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
""",

    "hld_c4_container.svg": """
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
""",

    "hld_rbac_hierarchy.svg": """
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
""",

    "hld_auction_lifecycle.svg": """
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
        Admin->>UI: Place Bid for Franchise Team
        UI->>UI: Validate Purse & Squad Capacity
        UI->>Audio: playBid() (High-pitch chime)
        UI->>UI: Update highBidder and currentBid
    end

    alt Final Hammer - SOLD
        Admin->>UI: Confirm Player SOLD
        UI->>Audio: playSold() & playHammer()
        UI->>UI: Trigger confetti & Update Squad
        UI->>API: PUT /api/players & PUT /api/teams
        API->>DB: Persist in MongoDB
    else Unsold - UNSOLD
        Admin->>UI: Mark Player UNSOLD
        UI->>Audio: playUnsold() & playHammer()
        UI->>UI: Mark player status = 'unsold'
        UI->>API: PUT /api/players
        API->>DB: Persist in MongoDB
    end
""",

    "hld_erd.svg": """
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
        string status
        number soldPrice
        string soldTo FK
    }

    TEAM {
        string id PK
        string name
        string shortName
        string owner
        string captainName
        number totalPurse
        number spentPurse
        number maxSquadSize
    }

    BID_HISTORY {
        string id PK
        string type
        string playerId FK
        string teamId FK
        number amount
        string timestamp
    }

    RULE {
        string id PK
        string number
        string title
        string desc
    }
""",

    "hld_deployment_topology.svg": """
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
    APIEndpoints -->|"Mongoose TLS SRV Connection"| Primary
    Primary -.->|"Replication"| Secondary1
    Primary -.->|"Replication"| Secondary2
""",

    # ── LLD Diagrams ────────────────────────────────────────────────────────
    "lld_react_component_tree.svg": """
graph TD
    App["App.jsx (Root Component)"]
    AuthProvider["AuthProvider (AuthContext.jsx)"]
    AppInner["AppInner (Main Container)"]
    
    Header["Header.jsx (Navigation, Stats, RBAC Badge)"]
    AuctioneerModal["AuctioneerManagerModal.jsx (Credentials Admin)"]
    
    AuctionRoom["AuctionRoom.jsx (Live Bidding Stage)"]
    TeamsView["TeamsView.jsx (Squad Rosters & Purses)"]
    PlayersPool["PlayersPool.jsx (Player Search & Stats)"]
    RulesHub["RulesHub.jsx (Tournament Guidelines)"]
    ScheduleStandings["ScheduleStandings.jsx (Points Table)"]
    ProjectorView["ProjectorView.jsx (Full-Screen TV Display)"]
    LoginPage["LoginPage.jsx (Auth Modal)"]

    App --> AuthProvider
    AuthProvider --> AppInner
    AppInner --> LoginPage
    AppInner --> Header
    AppInner --> AuctioneerModal
    AppInner --> AuctionRoom
    AppInner --> TeamsView
    AppInner --> PlayersPool
    AppInner --> RulesHub
    AppInner --> ScheduleStandings
    AppInner --> ProjectorView
""",

    "lld_sync_pipeline.svg": """
sequenceDiagram
    autonumber
    participant User
    participant State as React State (useState)
    participant LS as LocalStorage ('nepl_*')
    participant Debounce as Debounce Timer (500ms)
    participant API as Express API (/api/*)
    participant DB as MongoDB Atlas

    User->>State: Performs Auction Action (e.g. Place Bid, Sell)
    State->>LS: Instant sync (localStorage.setItem)
    State->>Debounce: Trigger debounce timer
    Note over Debounce: If no new changes within 500ms...
    Debounce->>API: HTTP PUT /api/{entity} (x-api-key)
    API->>DB: Mongoose updateMany / findOneAndUpdate
    DB-->>API: Write acknowledged
    API-->>Debounce: 200 OK Response
""",

    "lld_express_pipeline.svg": """
graph TD
    REQ["Incoming HTTP Request"] --> CORS["cors() Middleware"]
    CORS --> JSON["express.json({ limit: '2mb' })"]
    JSON --> APIKEY["verifyApiKey Middleware (/api/*)"]
    
    APIKEY --> AUTH["/api/auth Router"]
    APIKEY --> PLAYERS["/api/players Router"]
    APIKEY --> TEAMS["/api/teams Router"]
    APIKEY --> HIST["/api/history Router"]
    APIKEY --> RULES["/api/rules Router"]
    
    JSON --> HEALTH["/api/health Check"]
    JSON --> SWAGGER["/api/docs (Swagger UI)"]
    JSON --> REDOC["/api/redoc (Redoc 3-Column)"]
    JSON --> STATIC["express.static('dist') & SPA Fallback"]
""",

    "lld_error_resilience.svg": """
graph TD
    ERR["Application Exception / Error"]
    
    ERR --> DBERR{"Is it a MongoDB Connection Failure?"}
    DBERR -->|Yes| DBLOG["Log warning, emit status=disconnected to /api/health, auto-reconnect"]
    DBERR -->|No| AUTHERR{"Is it an Auth / API Key Error?"}
    
    AUTHERR -->|Yes| HTTP401["Return HTTP 401 Unauthorized"]
    AUTHERR -->|No| VALIDERR{"Is it a Schema Validation Error?"}
    
    VALIDERR -->|Yes| HTTP400["Return HTTP 400 Bad Request with details"]
    VALIDERR -->|No| HTTP500["Return HTTP 500 Internal Server Error"]

    DBLOG --> CLIENTFALLBACK["Client fallback: Continues auction in LocalStorage mode"]
""",

    # ── ARCHITECTURE Diagrams ────────────────────────────────────────────────
    "arch_c4_container.svg": """
graph TB
    subgraph BrowserClient ["Client Container (Web Browser)"]
        subgraph ReactApp ["React 19 SPA"]
            UIState["React Component State"]
            LocalCache["LocalStorage Layer"]
            AudioSynth["Web Audio Synthesizer"]
            ConfettiEngine["Canvas Confetti Engine"]
            APIService["API Client Service"]
        end
    end

    subgraph AppServer ["Backend Web Service (Express 5)"]
        subgraph ServerCore ["server/index.js"]
            CORSMw["CORS & JSON Body Parser"]
            AuthKeyMw["verifyApiKey Middleware"]
            
            subgraph Routers ["REST API Routers"]
                RAuth["/api/auth"]
                RPlayers["/api/players"]
                RTeams["/api/teams"]
                RHistory["/api/history"]
                RRules["/api/rules"]
            end

            SwaggerDocs["Interactive OpenAPI 3.0 (Swagger & Redoc)"]
            SPAFallback["Static Asset Server & SPA Fallback"]
        end
    end

    subgraph CloudDatabase ["Data Container (MongoDB Atlas)"]
        DBColls[("Database: nepl_cricket<br/>• players<br/>• teams<br/>• bidhistories<br/>• rules")]
    end

    UIState <--> LocalCache
    UIState --> AudioSynth
    UIState --> ConfettiEngine
    UIState --> APIService

    APIService -->|"REST API / JSON"| CORSMw
    CORSMw --> AuthKeyMw
    AuthKeyMw --> Routers
    Routers -->|"Mongoose ODM"| DBColls
    ServerCore --> SPAFallback
""",

    "arch_frontend_components.svg": """
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
        BiddingUtil["bidding.js (Tier Calculation)"]
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
""",

    "arch_erd.svg": """
erDiagram
    PLAYER ||--o| TEAM : "is assigned to"
    TEAM ||--o{ SQUAD_PLAYER : "has members"
    PLAYER ||--o{ BID_HISTORY : "subject of"
    TEAM ||--o{ BID_HISTORY : "bids placed by"
    RULE ||--|| TOURNAMENT : "applies to"

    PLAYER {
        string id UK
        string name
        string role
        string category
        number basePrice
        number runs
        number wickets
        string status
        number soldPrice
        string soldTo FK
        boolean isCaptain
    }

    TEAM {
        string id UK
        string name
        string shortName
        string owner
        string captainName
        number totalPurse
        number spentPurse
        number maxSquadSize
        number playersCount
        SquadPlayer[] squad
    }

    SQUAD_PLAYER {
        string id
        string name
        string role
        number soldPrice
    }

    BID_HISTORY {
        string id
        string type
        string playerId FK
        string teamId FK
        number amount
        string timestamp
    }

    RULE {
        string id UK
        string number
        string title
        string desc
    }
""",

    "arch_state_machine.svg": """
stateDiagram-v2
    [*] --> Available : Roster Import
    Available --> InAuction : Select Player
    Unsold --> InAuction : Bring Back to Table

    state InAuction {
        [*] --> BasePrice : Initialized at basePrice
        BasePrice --> ActiveBidding : First Bid
        ActiveBidding --> ActiveBidding : Higher Bid (+Slab)
        ActiveBidding --> CounterBid : Counter Bid
        CounterBid --> ActiveBidding
    }

    InAuction --> Sold : Hammer Down - SOLD
    InAuction --> Unsold : No Bids - UNSOLD
    
    Sold --> Available : Sale Reverted
    Unsold --> Available : Player Reset

    Sold --> [*] : Auction Complete
""",

    "arch_seq_auth.svg": """
sequenceDiagram
    autonumber
    actor User as User
    participant LoginUI as LoginPage.jsx
    participant AuthCtx as AuthContext.jsx
    participant API as Express /api/auth
    participant Env as Server Environment

    User->>LoginUI: Enters Email & Password
    LoginUI->>AuthCtx: login(email, password)
    AuthCtx->>API: POST /api/auth/login { email, password }
    API->>Env: Compare with Environment Credentials
    
    alt Credentials Valid
        API-->>AuthCtx: 200 OK { user profile }
        AuthCtx->>AuthCtx: createSession(user)
        AuthCtx-->>LoginUI: Session Active
        LoginUI-->>User: Authenticated UI Rendered
    else Invalid Credentials
        API-->>AuthCtx: 401 Unauthorized
        AuthCtx-->>LoginUI: Throws Error
        LoginUI-->>User: Show Error Alert
    end
""",

    "arch_seq_bidding.svg": """
sequenceDiagram
    autonumber
    actor Operator as 🔨 Auctioneer / ⚡ Super Admin
    participant UI as AuctionRoom.jsx
    participant BiddingUtil as bidding.js
    participant Sound as audio.js (Web Audio)
    participant State as React State
    participant Local as localStorage

    Operator->>UI: Clicks "+ Bid" / Team Quick-Bid
    UI->>BiddingUtil: getBidIncrement(currentBid)
    BiddingUtil-->>UI: Returns increment (+100, +200, etc.)
    UI->>UI: Validate Purse, Squad Capacity & High Bidder

    alt Constraints Pass
        UI->>Sound: soundFx.playBid()
        UI->>State: setCurrentBid(newBid), setHighBidder(team)
        State->>Local: Sync local state snapshot
    else Constraint Violation
        UI-->>Operator: Display Warning Alert
    end
""",

    "arch_seq_sold.svg": """
sequenceDiagram
    autonumber
    actor SuperAdmin as ⚡ Super Admin
    participant UI as AuctionRoom.jsx
    participant Confetti as canvas-confetti
    participant Sound as audio.js
    participant State as App State
    participant DB as MongoDB Atlas

    SuperAdmin->>UI: Clicks "SOLD" (Hammer Down)
    UI->>Sound: soundFx.playSold() & soundFx.playHammer()
    UI->>Confetti: Trigger full-screen confetti burst
    UI->>State: Update Player (status='sold', soldPrice, soldTo)
    UI->>State: Update Team (spentPurse += currentBid, add to squad)
    UI->>State: Append Bid History Record
    State->>DB: Debounced Sync to MongoDB (200 OK)
"""
}

def generate():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "design", "images")
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating {len(DIAGRAMS)} diagrams into: {output_dir}")
    
    for filename, mermaid_code in DIAGRAMS.items():
        clean_code = mermaid_code.strip()
        encoded = base64.urlsafe_b64encode(clean_code.encode('utf-8')).decode('ascii')
        url = f"https://mermaid.ink/svg/{encoded}"
        target_path = os.path.join(output_dir, filename)
        
        print(f"Fetching {filename}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
                with open(target_path, "wb") as f:
                    f.write(content)
            print(f"  ✅ Saved {filename} ({len(content)} bytes)")
        except Exception as e:
            print(f"  ❌ Error fetching {filename}: {e}")
            # Fallback placeholder svg
            with open(target_path, "w") as f:
                f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="50%" fill="#38bdf8" text-anchor="middle" font-family="sans-serif">{filename}</text></svg>')
        time.sleep(0.3)

if __name__ == "__main__":
    generate()
