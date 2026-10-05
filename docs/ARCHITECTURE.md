# SiteVoice: database relations and user flow

Diagrams are written in [Mermaid](https://mermaid.js.org); GitHub, GitLab and VS Code render them directly.
They describe what is implemented in `apps/api/prisma/schema.prisma` and `apps/api/src`.

## 1. Database relations

```mermaid
erDiagram
    ROLE ||--o{ PERMISSION : "grants"
    ROLE ||--o{ USER : "is held by"
    USER ||--o{ USER_SITE : "is allotted"
    SITE ||--o{ USER_SITE : "is allotted to"
    SITE ||--o{ TICKET : "receives"
    USER ||--o{ TICKET : "raises"
    USER |o--o{ TICKET : "acknowledges"
    TICKET ||--o{ TICKET_LOG : "has timeline"
    USER ||--o{ TICKET_LOG : "performs"
    TICKET ||--o{ ATTACHMENT : "has files"
    USER ||--o{ ATTACHMENT : "uploads"
    USER ||--o{ REFRESH_TOKEN : "signs in with"

    ROLE {
        uuid id PK
        string name UK "Admin, Manager, Supervisor, Client, or custom"
        string description
        boolean isSystem "the four defaults cannot be deleted"
    }

    PERMISSION {
        uuid id PK
        uuid roleId FK
        string action "create, read, update, acknowledge, changeStatus, comment, followUp, complete, viewInternal, manage"
        string subject "Ticket, Site, User, Role, Dashboard, all"
        enum scope "ALL, SITES (own sites), OWN (own tickets)"
    }

    USER {
        uuid id PK
        string name
        string email UK
        string passwordHash "bcrypt"
        uuid roleId FK
        boolean isActive "false signs the user out immediately"
        datetime createdAt
        datetime updatedAt
    }

    USER_SITE {
        uuid userId PK, FK
        uuid siteId PK, FK
    }

    SITE {
        uuid id PK
        string code UK "e.g. SITE-A"
        string name
        string location
        boolean isActive "inactive sites take no new tickets"
        datetime createdAt
    }

    TICKET {
        uuid id PK
        string refNo UK "TKT-2026-0001"
        string title
        string description
        enum type "QUALITY, RECOVERY, LABOUR, PRODUCTIVITY, PLANNING, SAFETY, OTHERS"
        enum priority "LOW, MEDIUM, HIGH, CRITICAL"
        enum status "PENDING, IN_PROGRESS, ON_HOLD, DISPUTE, COMPLETED"
        uuid siteId FK
        uuid raisedById FK "the client"
        uuid acknowledgedById FK "nullable"
        datetime acknowledgedAt "nullable"
        datetime completedAt "nullable"
        datetime createdAt
        datetime updatedAt
    }

    TICKET_LOG {
        uuid id PK
        uuid ticketId FK
        uuid actorId FK
        enum action "CREATED, ACKNOWLEDGED, STATUS_CHANGED, FOLLOW_UP, COMMENT, DETAILS_UPDATED, ATTACHMENT_ADDED"
        enum fromStatus "nullable"
        enum toStatus "nullable"
        string note "nullable"
        boolean internal "true = hidden from the client"
        datetime createdAt
    }

    ATTACHMENT {
        uuid id PK
        uuid ticketId FK
        uuid uploadedById FK
        string storedName UK "random name on disk"
        string originalName
        string mimeType
        int size
        boolean internal "true = hidden from the client"
        datetime createdAt
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash UK "sha256, rotated on every use"
        datetime expiresAt
        datetime revokedAt "nullable"
        datetime createdAt
    }

    TICKET_COUNTER {
        int year PK
        int last "running number behind TKT-year-nnnn"
    }
```

Notes:
- `TICKET_COUNTER` stands alone: it only produces the next reference number.
- Deleting a ticket removes its log and attachments; deleting a role removes its permissions.
- A user's visible sites come from `USER_SITE`. Permissions with scope `SITES` use it; Admins (`manage all`) bypass it.

## 2. User flow by role

```mermaid
flowchart TD
    start([Open SiteVoice]) --> login["Single login screen<br/>email + password"]
    login -->|wrong credentials| login
    login -->|signed in| home{"Role and permissions<br/>decide the menu"}

    home -->|Client| c1[Dashboard: status of all my tickets]
    home -->|Supervisor| s1[Tickets for my sites]
    home -->|Manager / HO| m1[Site-wise dashboard]
    home -->|Admin| a1[Dashboard: all sites]

    subgraph CLIENT["Client"]
        c1 --> c2[Raise a ticket]
        c2 --> c3["Pick site, type, priority<br/>add title, description, files"]
        c3 --> c4[Submit: ticket is Pending]
        c4 --> c5[Open ticket: progress and full log]
        c5 --> c6[Follow up any time]
        c6 --> c5
        c5 --> c7{Satisfied with the work?}
        c7 -->|yes| c8[Mark as Completed]
        c7 -->|no| c6
    end

    subgraph STAFF["Site Engineer / Supervisor and Manager / HO"]
        s1 --> t1[Open a ticket: all details]
        m1 --> m2[Filter tickets by site, status, priority]
        m2 --> t1
        t1 --> t2[Acknowledge the ticket]
        t2 --> t3["Add internal comment or photo<br/>never shown to the client"]
        t3 --> t4{"Admin granted<br/>changeStatus?"}
        t4 -->|yes| t5["Change status<br/>reason needed for On Hold or Dispute"]
        t4 -->|no| t6[Wait for client follow-up]
        m1 --> m3["Edit priority or type<br/>Manager only"]
    end

    subgraph ADMIN["Admin"]
        a1 --> d1[Sites: add or deactivate]
        a1 --> d2["Roles and permissions:<br/>choose what each role can do"]
        a1 --> d3["Users: create, assign role and sites,<br/>reset password, deactivate"]
        d2 -->|for example| d4[Let Supervisors change status]
        a1 --> d5[Do anything the other roles can]
    end

    c4 -.->|appears in| s1
    t5 -.->|client sees the change in the log| c5
    d4 -.->|applies on the next request| t4
```

## 3. Ticket status lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: client submits

    PENDING --> IN_PROGRESS: staff with changeStatus
    IN_PROGRESS --> ON_HOLD: reason required
    ON_HOLD --> IN_PROGRESS
    IN_PROGRESS --> DISPUTE: reason required
    DISPUTE --> IN_PROGRESS
    IN_PROGRESS --> COMPLETED
    PENDING --> COMPLETED: client confirms
    COMPLETED --> IN_PROGRESS: reopen, reason required

    COMPLETED --> [*]

    note right of PENDING
        Staff with changeStatus may move a ticket
        between any two statuses.
        The client can only move it to COMPLETED,
        and only on their own ticket.
    end note
```

## 4. One ticket, end to end

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant API as SiteVoice API
    participant DB as PostgreSQL
    actor S as Supervisor
    actor A as Admin

    C->>API: POST /tickets (form + files)
    API->>API: check role: create Ticket for this site
    API->>DB: ticket (PENDING), log CREATED, attachments
    API-->>C: reference TKT-2026-0001

    S->>API: GET /tickets
    API->>DB: only tickets of S's sites
    S->>API: POST /tickets/:id/acknowledge
    API->>DB: acknowledgedAt, log ACKNOWLEDGED

    S->>API: POST /tickets/:id/comments
    API->>DB: log COMMENT (internal = true)
    Note over C,S: The client never receives internal logs or files

    C->>API: POST /tickets/:id/follow-up
    API->>DB: log FOLLOW_UP (visible to all)

    S->>API: POST /tickets/:id/status (IN_PROGRESS)
    API-->>S: 403, no changeStatus permission
    A->>API: PUT /roles/:id/permissions (+ changeStatus)
    API->>DB: save permission rows
    S->>API: POST /tickets/:id/status (IN_PROGRESS)
    API->>DB: status updated, log STATUS_CHANGED
    API-->>S: 200, effective at once, no re-login

    C->>API: GET /tickets/:id
    API->>DB: ticket + logs where internal = false
    API-->>C: progress, log, allowed actions

    C->>API: POST /tickets/:id/complete
    API->>API: only the client who raised it
    API->>DB: status COMPLETED, completedAt, log STATUS_CHANGED
```

## 5. How each request is authorised

```mermaid
flowchart LR
    req([HTTP request]) --> rate{"Rate limit<br/>login 10 per minute"}
    rate -->|too many| r429[429]
    rate --> jwt{"Valid access token<br/>in cookie or Bearer?"}
    jwt -->|no| r401[401]
    jwt -->|yes| load["Load user, role, permissions<br/>and sites from the database"]
    load --> active{User active?}
    active -->|no| r401
    active -->|yes| build["Build CASL ability<br/>from the permission rows"]
    build --> route{"Role holds this permission<br/>for the route?"}
    route -->|no| r403[403]
    route -->|yes| rows["Service applies row rules:<br/>list filter or per-ticket check"]
    rows -->|ticket not visible| r404[404]
    rows -->|allowed| ok[Run the action]
```
