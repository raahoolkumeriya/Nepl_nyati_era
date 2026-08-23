# NEPL (Nyati Era Premier League) — System Design & Architecture

Welcome to the official technical design and system architecture documentation for **NEPL (Nyati Era Premier League) — Box Cricket Auction & League Management Platform**.

---

## 📚 Documentation Index

| Document | Purpose | Audience | Key Contents |
|---|---|---|---|
| [**HLD — High-Level Design**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/HLD.md) | Architectural blueprint & macro design | Architects, Tech Leads, Developers, Stakeholders | System Context, C4 Containers, RBAC Matrix, Domain Workflows, Deployment Topology, NFRs |
| [**LLD — Low-Level Design**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/LLD.md) | Detailed technical specifications | Frontend/Backend Engineers, DevOps | React Component Hierarchies, State Lifecycles, API Contracts, Bidding Slabs, Mongoose Schemas, Middleware, Sequence Flows |
| [**Architecture Diagrams**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/ARCHITECTURE.md) | Visual models & Mermaid charts | All Technical Roles | C4 Context/Container/Component Diagrams, ER Diagrams, State Machine, Sequence Diagrams, Deployment Blueprint |

---

## 🏟️ System Overview

**NEPL** is a real-time, box cricket player auction, squad management, and tournament administration platform built for the Nyati Era community.

### 🌟 Key Capabilities
- **Live Auction Room:** Real-time bidding engine with dynamic slab increments, purse budget enforcement, automatic squad limit validation, Web Audio synthesizer sound effects, and confetti celebrations.
- **Projector / Big Screen Mode:** Dedicated TV/projector view displaying live auctioneer actions, player profile cards, squad rosters, and bid activity with high visibility.
- **Squad & Purse Management:** Team budget tracking (spent purse, remaining balance, max squad size, captain badges, color themes).
- **Player Pool & Stats Management:** Complete player catalog with categories, roles, base prices, bowling/batting stats, CricHeroes profile links, and auction status filtering.
- **Rule Book & Tournament Guidelines:** Dynamic tournament regulations hub synced to database.
- **Tiered Role-Based Access Control (RBAC):** Four-tier security model (`Supreme Master`, `Super Admin`, `Auctioneer`, `Player`) with server-side credential verification and API key route protection.
- **Dual-Layer Persistence:** Optimistic UI updates with instant `localStorage` caching and debounced automatic persistence to MongoDB Atlas.

---

## 🛠️ Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│   React 19 (SPA)  •  Vite 5  •  Tailwind CSS 3  •  Lucide   │
│   Web Audio API Synthesizer  •  Canvas Confetti             │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API (JSON over HTTPS)
                               │  x-api-key & Session Headers
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Backend                      │
│   Node.js (ES Modules)  •  Express 5  •  Mongoose 9          │
│   OpenAPI 3.0 (Swagger UI + Redoc)  •  API Key Middleware    │
└──────────────────────────────┬──────────────────────────────┘
                               │  Mongoose ODM (TCP / TLS)
┌──────────────────────────────▼──────────────────────────────┐
│                      Data Store                             │
│   MongoDB Atlas Cloud Database (Database: nepl_cricket)     │
│   Collections: players, teams, bidhistories, rules          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧭 Navigating the System Design

1. **For Architecture Review & System Understanding**: Start with [HLD.md](file:///Users/raahool/applications/github/Nepl_nyati_era/design/HLD.md).
2. **For Implementation, Coding & API Reference**: Refer to [LLD.md](file:///Users/raahool/applications/github/Nepl_nyati_era/design/LLD.md).
3. **For Visual Flowcharts, ERDs & Sequence Diagrams**: Explore [ARCHITECTURE.md](file:///Users/raahool/applications/github/Nepl_nyati_era/design/ARCHITECTURE.md).
4. **Rendered Vector Diagrams**: All 17 architectural charts are rendered as high-resolution SVGs in the [`design/images/`](file:///Users/raahool/applications/github/Nepl_nyati_era/design/images) directory and embedded directly within the markdown documentation.
