# SiteVoice --- Design System & UI Specification

## 1. Purpose

This document is the single source of truth for the visual and
interaction design of **SiteVoice**, an enterprise ticket and grievance
management platform.

The UI must reflect the actual SiteVoice domain model and workflows:

-   Role-based access through roles and permissions
-   Site-based access for users
-   Client-raised tickets
-   Site Engineer / Supervisor workflows
-   Manager / HO site-wise monitoring
-   Admin configuration
-   Ticket acknowledgement
-   Internal comments and files
-   Client-visible follow-ups
-   Controlled status transitions
-   Ticket completion and reopening
-   Ticket activity timeline
-   Site management
-   User management
-   Role and permission management

The backend architecture defines `ROLE`, `PERMISSION`, `USER`,
`USER_SITE`, `SITE`, `TICKET`, `TICKET_LOG`, `ATTACHMENT`,
`REFRESH_TOKEN`, and `TICKET_COUNTER`. The design must expose only the
concepts that are meaningful to users and must respect the permission
and site-scope model.

The product direction is:

> **Linear-inspired light visual language + Intercom-inspired
> operational ticket workflow + enterprise administration UX.**

Do not copy any third-party product literally. Use these references only
for hierarchy, density, interaction quality, and visual restraint.

------------------------------------------------------------------------

# 2. Product Design Principles

## 2.1 Role-aware by default

The interface is not identical for every user.

The available navigation, actions, filters, and data must follow the
user's role and permissions.

The four system roles are:

-   Admin
-   Manager
-   Supervisor
-   Client

Custom roles may also exist.

Do not display actions that the user cannot perform merely to show that
they are unavailable. Prefer permission-aware navigation and action
rendering.

If an action can be visible but forbidden for a meaningful workflow,
clearly communicate the required permission.

------------------------------------------------------------------------

## 2.2 Site-aware by default

Sites are a first-class concept.

Users may be allotted to one or more sites through `USER_SITE`.

The interface must make site context visible whenever it affects the
data.

Examples:

-   Client: tickets for their allowed sites / own tickets according to
    permission
-   Supervisor: tickets for their sites
-   Manager / HO: site-wise dashboard and filters
-   Admin: all sites

Site filters should never be presented as decorative filters. They
determine the actual operational scope of the user.

------------------------------------------------------------------------

## 2.3 Ticket-first workflow

The ticket is the central object.

The most important information should be immediately visible:

1.  Reference number
2.  Title
3.  Site
4.  Type
5.  Priority
6.  Status
7.  Raised by
8.  Acknowledgement
9.  Activity
10. Files
11. Allowed next actions

------------------------------------------------------------------------

## 2.4 Separate client-visible and internal information

The system explicitly supports internal logs and internal attachments.

Internal information must never look like a normal customer-visible
message.

Use a visually distinct treatment:

-   Internal comment → muted amber/neutral surface
-   Internal attachment → explicit `Internal` badge
-   Client-visible follow-up/comment → normal conversation treatment
-   System event → compact timeline treatment

The interface must never imply that an internal note will be visible to
the client.

------------------------------------------------------------------------

## 2.5 Status is a workflow, not a decoration

The implemented lifecycle is:

``` text
PENDING
   ↓
IN_PROGRESS
   ↓
ON_HOLD
   ↓
IN_PROGRESS
   ↓
DISPUTE
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Additional supported transitions include:

-   PENDING → COMPLETED
-   COMPLETED → IN_PROGRESS, with reason required
-   Staff with `changeStatus` permission may move between statuses
    according to the backend authorization rules
-   Client may complete only their own ticket

The UI must never invent statuses such as `OPEN`, `RESOLVED`, or
`CLOSED` unless the backend model is changed accordingly.

------------------------------------------------------------------------

# 3. Visual Direction

## 3.1 Overall aesthetic

The application should be:

-   Light
-   Crisp
-   Calm
-   Dense but breathable
-   Enterprise-grade
-   Operational
-   Highly scannable

Avoid:

-   Large gradients
-   Excessive shadows
-   Glassmorphism
-   Neon colors
-   Oversized illustrations
-   Giant dashboard cards
-   Excessive pill-shaped containers
-   Decorative animations

The product should feel like a mature operational system rather than a
generic admin template.

------------------------------------------------------------------------

# 4. Color System

## 4.1 Primary

  Token            Hex         Usage
  ---------------- ----------- ----------------------------------------
  Primary          `#2563EB`   Main actions, active navigation, links
  Primary Hover    `#1D4ED8`   Hover
  Primary Active   `#1E40AF`   Pressed state
  Primary Soft     `#EFF6FF`   Selected backgrounds
  Primary Subtle   `#DBEAFE`   Informational highlight

Blue is the primary action color.

------------------------------------------------------------------------

## 4.2 Neutrals

  Token            Hex         Usage
  ---------------- ----------- ------------------------
  Background       `#F8FAFC`   Application background
  Surface          `#FFFFFF`   Panels and cards
  Surface Muted    `#F1F5F9`   Secondary areas
  Surface Hover    `#F8FAFC`   Hover
  Border           `#E2E8F0`   Default border
  Border Strong    `#CBD5E1`   Input/emphasis border
  Text Primary     `#0F172A`   Main text
  Text Secondary   `#475569`   Supporting text
  Text Muted       `#64748B`   Metadata
  Text Disabled    `#94A3B8`   Disabled

Prefer borders over shadows.

------------------------------------------------------------------------

# 5. Semantic Color System

## Success

-   Base: `#16A34A`
-   Soft: `#F0FDF4`
-   Border: `#BBF7D0`

Use for successful operations and completed states.

## Warning

-   Base: `#D97706`
-   Soft: `#FFFBEB`
-   Border: `#FDE68A`

Use for `ON_HOLD`, attention-required conditions, and warning states.

## Error

-   Base: `#DC2626`
-   Soft: `#FEF2F2`
-   Border: `#FECACA`

Use for `CRITICAL`, failed actions, validation errors, and serious
exceptions.

## Info

-   Base: `#2563EB`
-   Soft: `#EFF6FF`
-   Border: `#BFDBFE`

Use for informational system states.

------------------------------------------------------------------------

# 6. Ticket Type Colors

Ticket types are:

-   QUALITY
-   RECOVERY
-   LABOUR
-   PRODUCTIVITY
-   PLANNING
-   SAFETY
-   OTHERS

Do **not** assign seven strong colors to these types.

Use neutral badges by default.

Example:

``` text
QUALITY
RECOVERY
LABOUR
PRODUCTIVITY
PLANNING
SAFETY
OTHERS
```

Only `SAFETY` may receive an optional stronger warning treatment where
appropriate. Type should remain secondary to status and priority.

------------------------------------------------------------------------

# 7. Priority System

  Priority   Color    Treatment
  ---------- -------- -----------
  LOW        Slate    Neutral
  MEDIUM     Amber    Moderate
  HIGH       Orange   Strong
  CRITICAL   Red      Strongest

Never color an entire ticket row according to priority.

Use:

-   Small priority icon
-   Badge
-   Text

Color must never be the only indicator.

------------------------------------------------------------------------

# 8. Status System

Use the exact backend statuses.

  Status        UI label      Color
  ------------- ------------- -------------
  PENDING       Pending       Blue
  IN_PROGRESS   In Progress   Indigo/Blue
  ON_HOLD       On Hold       Amber
  DISPUTE       Dispute       Red/Orange
  COMPLETED     Completed     Green

Use human-readable labels in the UI.

Do not expose raw enum names unless useful for technical/admin contexts.

------------------------------------------------------------------------

# 9. Typography

## Font

Use:

**Inter**

Fallback:

``` text
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

## Scale

  Element                 Size    Weight
  ----------------- ---------- ---------
  Page title              24px       600
  Section heading         18px       600
  Card heading        15--16px       600
  Body                    14px       400
  Body emphasis           14px       500
  Table               13--14px   400/500
  Metadata            12--13px       400
  Button                  14px       500

Use sentence case.

------------------------------------------------------------------------

# 10. Spacing

Use a 4px spacing scale.

``` text
4
8
12
16
20
24
32
40
48
```

Recommended:

-   Input height: 38--40px
-   Button height: 36--40px
-   Card padding: 20--24px
-   Table row: 12--14px vertical
-   Section gap: 24--32px
-   Page padding: 24--32px

------------------------------------------------------------------------

# 11. Application Shell

Desktop:

``` text
┌────────────────┬───────────────────────────────────────────────┐
│                │ Top Header                                   │
│                ├───────────────────────────────────────────────┤
│    Sidebar     │                                               │
│                │ Main content                                  │
│                │                                               │
└────────────────┴───────────────────────────────────────────────┘
```

Recommended:

-   Sidebar: 240px
-   Collapsed sidebar: 64px
-   Header: 56--64px
-   Background: `#F8FAFC`

Sidebar:

-   White
-   Thin right border
-   No dark background by default

------------------------------------------------------------------------

# 12. Navigation Architecture

The menu is role and permission aware.

## Shared conceptual navigation

``` text
Dashboard

Tickets
  ├── All Tickets
  ├── My Tickets
  ├── Pending
  ├── In Progress
  ├── On Hold
  ├── Dispute
  └── Completed

Management
  ├── Sites
  ├── Users
  └── Roles & Permissions

Insights
  ├── Analytics
  └── Reports

System
  └── Settings
```

The actual visible menu must be determined by permissions.

Do not force every role to see every section.

------------------------------------------------------------------------

# 13. Role-Specific Home Experience

## Client

Primary home:

**My Ticket Dashboard**

Show:

-   My pending tickets
-   My in-progress tickets
-   My on-hold tickets
-   My disputed tickets
-   My completed tickets
-   Recent ticket activity
-   `Raise a Ticket`

Primary workflow:

``` text
Dashboard
→ Raise a Ticket
→ Ticket submitted as Pending
→ Open ticket
→ Follow up
→ Mark Completed
```

------------------------------------------------------------------------

## Supervisor

Primary home:

**Tickets for My Sites**

Show:

-   Pending tickets
-   Unacknowledged tickets
-   In-progress tickets
-   On-hold tickets
-   Disputes
-   Completed tickets
-   Site filter

Primary actions:

-   Open ticket
-   Acknowledge
-   Add internal comment
-   Add internal attachment
-   Follow up
-   Change status only if permission exists

------------------------------------------------------------------------

## Manager / HO

Primary home:

**Site-wise Dashboard**

Show:

-   Ticket volume by site
-   Status distribution
-   Priority distribution
-   Type distribution
-   Open/in-progress workload
-   Disputes
-   Completion trends

Filters:

-   Site
-   Type
-   Priority
-   Status
-   Date range

Manager-only ticket editing:

-   Change priority
-   Change type

Only expose these actions where the backend permission model allows
them.

------------------------------------------------------------------------

## Admin

Primary home:

**All Sites Dashboard**

Admin has visibility across the platform and can manage:

-   Sites
-   Users
-   Roles
-   Permissions
-   Ticket configuration available to the application
-   Other administration functions

Admin can perform the capabilities granted by the system's
administrative permission model.

------------------------------------------------------------------------

# 14. Dashboard Design

Dashboards must reflect the user's actual scope.

## Client dashboard

Avoid organization-wide analytics.

Use:

``` text
My Tickets

Pending      In Progress      On Hold      Dispute      Completed
  12              8              2            1             31
```

Then:

-   Recent tickets
-   Recent activity
-   Raise a Ticket

------------------------------------------------------------------------

## Supervisor dashboard

Use site-scoped operational metrics:

``` text
My Sites

Pending | Unacknowledged | In Progress | On Hold | Dispute | Completed
```

Then:

-   Ticket list
-   Site distribution
-   Priority distribution
-   Recent activity

------------------------------------------------------------------------

## Manager / HO dashboard

Use site comparison.

Recommended:

1.  Total tickets by site
2.  Status by site
3.  Priority by site
4.  Type by site
5.  Completion trend
6.  Dispute trend

------------------------------------------------------------------------

## Admin dashboard

Use all-site overview.

Recommended:

-   Total tickets
-   Pending
-   In Progress
-   On Hold
-   Dispute
-   Completed
-   Active sites
-   Active users

Do not fabricate SLA metrics unless SLA is actually implemented in the
backend.

------------------------------------------------------------------------

# 15. Ticket List

The ticket list is a primary operational screen.

## Header

``` text
Tickets                                  + Raise a Ticket

Search by reference, title, or requester...

[Site] [Status] [Priority] [Type] [Raised By] [More Filters]
```

Available filters must respect user scope.

## Recommended columns

``` text
Reference
Title
Site
Type
Priority
Status
Raised By
Acknowledged By
Updated
```

Optional:

-   Created
-   Completed
-   Attachment indicator

Do not show internal information to users who cannot access it.

------------------------------------------------------------------------

# 16. Ticket Row

Example:

``` text
TKT-2026-0001
Quality issue with equipment

SITE-A
QUALITY
HIGH
In Progress

Raised by
Rohit

Updated
10 min ago
```

Interaction:

-   Clicking the reference or title opens the ticket
-   Hover gives a subtle background
-   Row should not be visually overloaded

------------------------------------------------------------------------

# 17. Raise a Ticket

The client workflow is:

``` text
Raise a Ticket
      ↓
Pick Site
      ↓
Pick Type
      ↓
Pick Priority
      ↓
Title
      ↓
Description
      ↓
Attachments
      ↓
Submit
      ↓
Ticket becomes PENDING
```

## Form

### Ticket details

-   Site
-   Type
-   Priority
-   Title
-   Description

### Attachments

-   Add files
-   Show filename
-   Show size
-   Remove before submission

### Action

`Submit Ticket`

After success:

``` text
Ticket submitted successfully

TKT-2026-0001

Status: Pending

[Open Ticket]
```

------------------------------------------------------------------------

# 18. Ticket Detail

The ticket detail screen is the most important screen in the product.

Desktop layout:

``` text
┌────────────────┬────────────────────────────────┬──────────────────┐
│ Ticket list    │ Ticket conversation            │ Ticket details   │
│                │                                │                  │
│ TKT-0001       │ #TKT-2026-0001                │ Status           │
│ TKT-0002       │ Quality issue...               │ Priority         │
│ TKT-0003       │                                │ Site             │
│                │ Description                    │ Type             │
│                │                                │ Raised by        │
│                │ Activity                       │ Acknowledged by  │
│                │                                │                  │
│                │ Follow-up / comment            │ Attachments      │
│                │                                │                  │
└────────────────┴────────────────────────────────┴──────────────────┘
```

The left ticket list is optional on narrow layouts.

------------------------------------------------------------------------

# 19. Ticket Header

Show:

``` text
TKT-2026-0001

Quality issue with equipment

Pending
High

Site-A
Quality
```

Header actions depend on permission and role.

Possible actions:

-   Acknowledge
-   Change status
-   Follow up
-   Mark Completed
-   Edit priority
-   Edit type
-   Add attachment

Never display an action if the user cannot perform it.

------------------------------------------------------------------------

# 20. Acknowledgement

Acknowledgement is a distinct operation.

When not acknowledged:

``` text
Not yet acknowledged

[Acknowledge Ticket]
```

When acknowledged:

``` text
Acknowledged by
Rahul Sharma
Today, 10:42 AM
```

Acknowledge action should be visually prominent for staff where
permitted.

Do not confuse acknowledgement with status.

A ticket can be acknowledged without changing its status.

------------------------------------------------------------------------

# 21. Conversation & Timeline

The ticket timeline is based on `TICKET_LOG`.

Supported actions include:

-   Created
-   Acknowledged
-   Status changed
-   Follow-up
-   Comment
-   Details updated
-   Attachment added

Represent system actions as compact events.

Example:

``` text
10:42 AM  Rahul acknowledged the ticket

10:48 AM  Status changed
           Pending → In Progress

11:05 AM  Client added a follow-up

11:12 AM  Rahul added an internal comment
```

------------------------------------------------------------------------

# 22. Internal Comments

Internal comments have:

``` text
Internal note
Visible only to staff
```

Use a muted amber/neutral background.

Example:

``` text
┌─────────────────────────────────────────────┐
│ Internal note                               │
│                                             │
│ Checked the equipment and identified the    │
│ issue. Replacement part is being arranged.  │
│                                             │
│ Rahul Sharma · 11:12 AM                     │
└─────────────────────────────────────────────┘
```

The client must not receive or see internal logs.

------------------------------------------------------------------------

# 23. Client Follow-Up

Follow-up is different from an internal comment.

Client-facing follow-up should appear as a normal conversation event.

Example:

``` text
Client follow-up

The issue is still present. Please check again.

Rohit · 11:35 AM
```

Follow-up remains part of the ticket history.

------------------------------------------------------------------------

# 24. Attachments

Attachments belong to tickets and have an uploader.

Display:

``` text
Attachments

equipment-photo.jpg
2.4 MB
Uploaded by Rahul

[Open] [Download]
```

Internal attachments must show:

`Internal`

Client-visible attachments must not expose internal files.

Do not expose stored filenames such as random server-generated names in
the primary UI.

Use `originalName`.

------------------------------------------------------------------------

# 25. Status Change UI

Changing status is permission controlled.

When a user has `changeStatus` permission:

``` text
Change status

Current: In Progress

New status:
[Pending]
[In Progress]
[On Hold]
[Dispute]
[Completed]

Reason
[Required for On Hold / Dispute / Reopen]

[Cancel] [Update Status]
```

For:

-   `ON_HOLD` → reason required
-   `DISPUTE` → reason required
-   `COMPLETED → IN_PROGRESS` → reopen reason required

The UI must enforce the same validation expected by the backend.

------------------------------------------------------------------------

# 26. Client Completion

The client may mark **their own ticket** as completed.

Show:

``` text
Are you satisfied with the work?

[Mark as Completed]
[Follow Up Instead]
```

Do not expose arbitrary status controls to the client.

The client should not be able to manually set:

-   In Progress
-   On Hold
-   Dispute
-   Pending

------------------------------------------------------------------------

# 27. Reopening

When a completed ticket is reopened:

``` text
Reopen ticket?

Please provide a reason for reopening.

Reason
[................................]

[Cancel] [Reopen Ticket]
```

The activity timeline must clearly show:

``` text
Ticket reopened
Completed → In Progress

Reason:
Issue is still unresolved.
```

------------------------------------------------------------------------

# 28. Ticket Type and Priority Editing

Managers can edit priority/type where their permissions allow.

Use an inline or drawer editor:

``` text
Edit ticket details

Type
[Quality]

Priority
[High]

[Cancel] [Save Changes]
```

Log changes in the ticket timeline as `DETAILS_UPDATED`.

------------------------------------------------------------------------

# 29. Ticket Details Panel

Use sections:

## Overview

-   Reference
-   Site
-   Type
-   Priority
-   Status

## Requester

-   Name
-   Email
-   Role

## Acknowledgement

-   Acknowledged by
-   Acknowledged at

## Dates

-   Created
-   Updated
-   Completed

## Attachments

-   Files
-   Visibility

Sections can collapse.

------------------------------------------------------------------------

# 30. Site Management

Sites are first-class administrative entities.

Site fields:

-   Code
-   Name
-   Location
-   Active/inactive
-   Created date

Example:

``` text
Sites

SITE-A
Mumbai Plant
Mumbai
Active

SITE-B
Pune Plant
Pune
Inactive
```

Inactive sites:

-   Remain visible to authorized administrators
-   Cannot receive new tickets
-   Should show an explicit `Inactive` state

Do not delete a site merely to hide it from normal operations.

------------------------------------------------------------------------

# 31. User Management

User fields:

-   Name
-   Email
-   Role
-   Active/inactive
-   Assigned sites
-   Created
-   Updated

List:

``` text
User
Email
Role
Sites
Status
Last Activity
Actions
```

User detail:

``` text
Profile
Role
Assigned Sites
Permissions
Ticket Activity
```

Deactivation must be visually clear.

When a user becomes inactive, the UI should communicate that access is
disabled.

------------------------------------------------------------------------

# 32. Role Management

System roles:

-   Admin
-   Manager
-   Supervisor
-   Client

System roles cannot be deleted.

Custom roles can be created.

Role fields:

-   Name
-   Description
-   System role indicator
-   Permissions
-   User count

------------------------------------------------------------------------

# 33. Permission Management

Permissions use:

``` text
action
subject
scope
```

Actions include:

-   create
-   read
-   update
-   acknowledge
-   changeStatus
-   comment
-   followUp
-   complete
-   viewInternal
-   manage

Subjects include:

-   Ticket
-   Site
-   User
-   Role
-   Dashboard
-   all

Scopes:

-   ALL
-   SITES
-   OWN

The permission UI should group permissions by subject.

Example:

``` text
Ticket

☑ View tickets
☑ Create tickets
☑ Update tickets
☑ Acknowledge tickets
☑ Change status
☑ Comment
☑ Follow up
☑ Complete
☑ View internal content
```

Then:

``` text
Scope

○ All
○ Assigned sites
○ Own tickets
```

Do not expose raw CASL implementation details in the UI.

------------------------------------------------------------------------

# 34. Permission Scope UX

Explain scopes in human language.

Instead of:

``` text
SITES
```

display:

``` text
Assigned Sites
Can access tickets belonging to the user's assigned sites.
```

Instead of:

``` text
OWN
```

display:

``` text
Own Tickets
Can access tickets raised by the user.
```

Instead of:

``` text
ALL
```

display:

``` text
All
Can access all records permitted by this permission.
```

------------------------------------------------------------------------

# 35. Site Assignment

User-site assignment should be a dedicated control.

Example:

``` text
Assigned Sites

☑ SITE-A — Mumbai Plant
☑ SITE-B — Pune Plant
☐ SITE-C — Delhi Plant

[Save]
```

For Client/Supervisor users, site assignment is operationally
significant.

Make it easy to understand.

------------------------------------------------------------------------

# 36. Reports

Only expose reports supported by actual data.

Recommended reports:

-   Ticket volume
-   Tickets by site
-   Tickets by type
-   Tickets by priority
-   Tickets by status
-   Completion trend
-   Dispute trend
-   On-hold trend
-   User/role workload where meaningful

Do not show SLA reports unless an actual SLA model exists.

------------------------------------------------------------------------

# 37. Audit / Activity Log

The ticket's activity log is user-facing and operational.

Example:

``` text
11:12 AM
Rahul Sharma

Changed status

In Progress → On Hold

Reason:
Waiting for replacement part.
```

Admin-level audit screens can provide more technical information if
implemented, but the standard ticket timeline should remain
human-readable.

------------------------------------------------------------------------

# 38. Filters

Ticket filters should include only meaningful dimensions:

``` text
Search
Site
Status
Priority
Type
Raised By
Acknowledgement
Date
```

Role-specific restrictions apply.

For example:

-   Client should not get an unrestricted all-site filter.
-   Supervisor should see their allowed sites.
-   Manager/HO should get site-wide filtering.
-   Admin can access all sites.

------------------------------------------------------------------------

# 39. Search

Global search should support:

-   Ticket reference
-   Ticket title
-   Requester name
-   Requester email
-   Site code
-   Site name

Ticket reference is especially important because the system generates:

``` text
TKT-2026-0001
```

Search results should show enough context:

``` text
TKT-2026-0001
Quality issue with equipment
SITE-A · High · In Progress
```

------------------------------------------------------------------------

# 40. Empty States

## No tickets

``` text
No tickets yet

Raise a ticket to start tracking an issue.

[Raise a Ticket]
```

## No matching results

``` text
No tickets match these filters.

Try changing your filters.
[Clear Filters]
```

## No assigned sites

``` text
No sites assigned

Contact an administrator to get access to a site.
```

Do not use decorative illustrations.

------------------------------------------------------------------------

# 41. Loading States

Use skeletons for:

-   Ticket table
-   Dashboard metrics
-   Ticket details
-   Timeline
-   User list
-   Site list

Preserve the page structure while loading.

------------------------------------------------------------------------

# 42. Error States

Errors must explain:

1.  What failed
2.  What the user can do

Example:

``` text
Unable to load this ticket

The ticket could not be retrieved.

[Retry]
```

For authorization:

``` text
You don't have permission to perform this action.
```

Do not expose backend implementation details.

------------------------------------------------------------------------

# 43. Authentication UI

The architecture uses one login screen:

``` text
┌──────────────────────────────────────┐
│             SiteVoice                │
│                                      │
│ Email                                │
│ [................................]   │
│                                      │
│ Password                             │
│ [................................]   │
│                                      │
│             [Sign In]                │
│                                      │
│ Invalid credentials are shown here. │
└──────────────────────────────────────┘
```

Do not create separate login screens for each role.

Role and permissions determine the application after login.

------------------------------------------------------------------------

# 44. Authorization Feedback

The system distinguishes:

-   Unauthenticated → 401
-   Forbidden → 403
-   Not visible → 404

The UI should avoid revealing sensitive information.

For example, if a user does not have access to a ticket, do not expose
ticket metadata in a forbidden state.

Prefer:

``` text
Ticket not found
```

where the backend intentionally masks inaccessible records.

------------------------------------------------------------------------

# 45. Rate Limit Feedback

Login rate limiting exists.

If login attempts are throttled:

``` text
Too many sign-in attempts

Please wait a moment and try again.
```

Do not expose implementation-specific rate-limit details.

------------------------------------------------------------------------

# 46. Buttons

## Primary

Blue filled.

Examples:

-   `Raise a Ticket`
-   `Submit Ticket`
-   `Acknowledge`
-   `Save`
-   `Update Status`

## Secondary

White with border.

Examples:

-   `Cancel`
-   `Export`
-   `Clear Filters`

## Destructive

Red.

Examples:

-   `Delete Role`
-   `Deactivate User`

Do not use destructive actions as primary unless unavoidable.

------------------------------------------------------------------------

# 47. Inputs

Default:

-   Height: 38--40px
-   Radius: 8px
-   White background
-   `#CBD5E1` border
-   14px text

Focus:

-   Blue border
-   Visible blue focus ring

Errors:

-   Red border
-   Clear text explanation

------------------------------------------------------------------------

# 48. Cards

Use cards for:

-   KPI summaries
-   Dashboard sections
-   Ticket detail panels
-   Form sections where useful

Avoid turning every table or field into a card.

Default:

``` text
background: white
border: 1px solid #E2E8F0
radius: 10–12px
shadow: none / extremely subtle
```

------------------------------------------------------------------------

# 49. Tables

Rules:

-   Compact rows
-   Sticky header for long lists
-   Sorting
-   Filtering
-   Pagination
-   Result count
-   Column visibility where useful
-   Clear empty state

Use subtle separators.

Do not use colored full-row backgrounds for status or priority.

------------------------------------------------------------------------

# 50. Modals & Drawers

Use modals for:

-   Confirmation
-   Short actions
-   Delete/deactivate
-   Status change
-   Reopen reason

Use drawers for:

-   User details
-   Site details
-   Role permission editing
-   Secondary information

Do not put large multi-step workflows inside tiny modals.

------------------------------------------------------------------------

# 51. Notifications

Use toast notifications for successful actions.

Examples:

``` text
Ticket created successfully.
```

``` text
Ticket acknowledged.
```

``` text
Status updated.
```

``` text
Role permissions saved.
```

Errors must include recovery guidance where possible.

------------------------------------------------------------------------

# 52. Icons

Use a single outline icon family such as Lucide.

Recommended sizes:

-   Navigation: 18px
-   Button: 16px
-   Table action: 16px
-   Header: 18px

Never use inconsistent icon styles.

Icons should support labels rather than replace important text.

------------------------------------------------------------------------

# 53. Responsive Design

## Desktop

Full experience:

-   Sidebar
-   Ticket list
-   Conversation
-   Details panel

## Tablet

-   Collapsible sidebar
-   Reduced table columns
-   Ticket detail can become two-column

## Mobile

Single-column:

``` text
Ticket header
Status / priority
Details
Conversation
Activity
Attachments
Actions
```

The reply/follow-up composer should remain easy to access.

------------------------------------------------------------------------

# 54. Accessibility

Minimum target:

**WCAG AA**

Requirements:

-   Keyboard navigation
-   Visible focus states
-   Accessible form labels
-   Accessible buttons
-   Status not communicated by color alone
-   Adequate contrast
-   Error messages associated with fields
-   40--44px practical touch targets on mobile

------------------------------------------------------------------------

# 55. Interaction & Motion

Use short transitions:

``` text
120–180ms
```

Animate only:

-   Hover
-   Focus
-   Dropdown
-   Drawer
-   Modal
-   Toast
-   Small state transitions

Avoid decorative animation.

------------------------------------------------------------------------

# 56. Design Tokens

``` css
:root {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-muted: #F1F5F9;
  --surface-hover: #F8FAFC;

  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-active: #1E40AF;
  --primary-soft: #EFF6FF;
  --primary-subtle: #DBEAFE;

  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #64748B;
  --text-disabled: #94A3B8;

  --border: #E2E8F0;
  --border-strong: #CBD5E1;

  --success: #16A34A;
  --success-soft: #F0FDF4;

  --warning: #D97706;
  --warning-soft: #FFFBEB;

  --error: #DC2626;
  --error-soft: #FEF2F2;

  --info: #2563EB;
  --info-soft: #EFF6FF;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
}
```

------------------------------------------------------------------------

# 57. Component Library

Core components:

-   Button
-   Input
-   Select
-   Combobox
-   Checkbox
-   Radio
-   Switch
-   Date picker
-   Badge
-   Status badge
-   Priority badge
-   Type badge
-   Avatar
-   Tooltip
-   Dropdown
-   Modal
-   Drawer
-   Tabs
-   Accordion
-   Table
-   Pagination
-   Breadcrumb
-   Toast
-   Alert
-   Skeleton
-   Empty state
-   Timeline
-   File upload
-   Text editor

------------------------------------------------------------------------

# 58. SiteVoice-Specific Components

Create reusable components:

``` text
TicketStatusBadge
TicketPriorityBadge
TicketTypeBadge
TicketRow
TicketTable
TicketFilters
TicketHeader
TicketConversation
TicketMessage
InternalNote
FollowUpMessage
SystemEvent
TicketComposer
TicketDetailsPanel
TicketActivityTimeline
AcknowledgementStatus
AttachmentList
AttachmentItem
StatusChangeDialog
ReopenDialog
SiteSelector
SiteBadge
RolePermissionMatrix
SiteAssignmentSelector
```

All components must consume the same design tokens.

------------------------------------------------------------------------

# 59. Ticket Workflow Component Rules

## Client

Allowed visible actions depend on permissions, but the core UX should
support:

``` text
Raise Ticket
View Own Ticket
Follow Up
Mark Completed
```

## Staff

Where permitted:

``` text
View
Acknowledge
Comment
Add Internal Attachment
Follow Up
Change Status
```

## Manager

Where permitted:

``` text
View
Edit Priority
Edit Type
```

## Admin

Administrative management:

``` text
Sites
Users
Roles
Permissions
All-site visibility
```

The permission system remains the final authority.

------------------------------------------------------------------------

# 60. Do / Don't

## Do

-   Use the exact implemented ticket statuses.
-   Make site context visible.
-   Make acknowledgement explicit.
-   Separate internal and client-visible activity.
-   Show the ticket reference prominently.
-   Use compact operational tables.
-   Make actions permission-aware.
-   Explain permission scopes in human language.
-   Make status transitions understandable.
-   Require reasons where workflow requires them.
-   Keep the light theme clean.
-   Use semantic colors carefully.

## Don't

-   Invent unsupported statuses.
-   Show internal comments to clients.
-   Show internal attachments to clients.
-   Allow clients to arbitrarily change status.
-   Show all-site data to site-scoped users.
-   Create a fake SLA system.
-   Hide site context from site-scoped workflows.
-   Use color as the only state indicator.
-   Make every element a card.
-   Use excessive gradients or shadows.
-   Create separate role-specific login screens.

------------------------------------------------------------------------

# 61. Important Domain Constraints Reflected in UI

The following are non-negotiable:

### Ticket reference

Format:

``` text
TKT-YYYY-NNNN
```

Example:

``` text
TKT-2026-0001
```

Display this prominently.

### Ticket status

Only use:

``` text
PENDING
IN_PROGRESS
ON_HOLD
DISPUTE
COMPLETED
```

### Ticket types

Only use:

``` text
QUALITY
RECOVERY
LABOUR
PRODUCTIVITY
PLANNING
SAFETY
OTHERS
```

### Priorities

Only use:

``` text
LOW
MEDIUM
HIGH
CRITICAL
```

### Roles

System defaults:

``` text
Admin
Manager
Supervisor
Client
```

### Permission scopes

Only use:

``` text
ALL
SITES
OWN
```

### Internal visibility

Anything marked internal must be clearly hidden from client-facing
experiences.

------------------------------------------------------------------------

# 62. Recommended Page Map

``` text
/auth/login

/dashboard

/tickets
/tickets/:id
/tickets/new

/sites
/sites/:id

/users
/users/:id

/roles
/roles/:id

/reports
/analytics

/settings
```

Routes may differ in implementation, but the UX hierarchy should remain
consistent.

------------------------------------------------------------------------

# 63. Screen Specifications

## Login

Goal: authenticate quickly.

Primary action:

`Sign In`

------------------------------------------------------------------------

## Dashboard

Goal: understand current operational state.

Content depends on role.

------------------------------------------------------------------------

## Tickets

Goal: find and process tickets quickly.

Primary action:

`Raise a Ticket` where permission allows.

------------------------------------------------------------------------

## Ticket Detail

Goal: understand and act on one ticket.

Priority information:

1.  Status
2.  Priority
3.  Site
4.  Type
5.  Conversation
6.  Activity
7.  Actions

------------------------------------------------------------------------

## Raise Ticket

Goal: submit a clear ticket with enough information to act.

Keep form simple.

------------------------------------------------------------------------

## Sites

Goal: manage operational locations.

Primary action:

`Add Site`

------------------------------------------------------------------------

## Users

Goal: manage access and site assignments.

Primary action:

`Add User`

------------------------------------------------------------------------

## Roles

Goal: configure permissions.

Primary action:

`Create Role`

------------------------------------------------------------------------

## Reports

Goal: understand ticket operations.

Avoid metrics that are not supported by the underlying data model.

------------------------------------------------------------------------

# 64. UX Rules for Permission Changes

Permission changes take effect immediately according to the
architecture.

The UI should communicate successful permission updates clearly.

Example:

``` text
Permissions updated

Supervisor can now change ticket status.
```

Do not require a user to re-login merely because a permission changed.

If an action is rejected:

``` text
You don't have permission to change this ticket's status.
```

------------------------------------------------------------------------

# 65. UX Rules for Inactive Records

## Inactive user

Display:

``` text
Inactive
```

with a neutral/red semantic treatment.

## Inactive site

Display:

``` text
Inactive
```

and prevent new ticket creation for that site.

Do not hide inactive sites from administrators.

------------------------------------------------------------------------

# 66. Final Product Experience

SiteVoice should feel like:

**A modern enterprise operations platform for managing site-based
tickets and grievances.**

The experience should communicate:

> Clear ownership. Clear site scope. Clear status. Clear history. Clear
> next action.

The user should always understand:

1.  What ticket am I looking at?
2.  Which site does it belong to?
3.  What is its current status?
4.  What is its priority?
5.  Who raised it?
6.  Has it been acknowledged?
7.  What happened previously?
8.  What can I do next?
9.  Is this information internal or client-visible?
10. What permissions determine my available actions?

------------------------------------------------------------------------

# 67. Definition of Done

A screen is complete only when:

-   It uses shared design tokens.
-   It uses shared components.
-   It respects role permissions.
-   It respects site scope.
-   It uses the actual domain terminology.
-   It supports relevant loading/empty/error states.
-   It handles disabled and unauthorized actions.
-   It distinguishes internal and client-visible information.
-   It follows the actual ticket status lifecycle.
-   It works responsively.
-   It meets accessibility requirements.
-   It does not introduce unsupported functionality.
-   It visually belongs to the same SiteVoice product.

------------------------------------------------------------------------

# 68. Non-Negotiable Design Rules

1.  **Light theme is the default.**
2.  **White surfaces and subtle borders are preferred over shadows.**
3.  **Blue is the primary action color.**
4.  **Use only the implemented ticket statuses.**
5.  **Use only the implemented ticket types.**
6.  **Site scope must be reflected in the UI.**
7.  **Permissions determine available actions.**
8.  **Internal comments/files must never appear in client views.**
9.  **Acknowledgement is separate from status.**
10. **Status-change reasons are required where the workflow requires
    them.**
11. **Client completion is limited to the client's own ticket.**
12. **Completed → In Progress requires a reopen reason.**
13. **Do not invent SLA functionality unless it exists in the backend.**
14. **Do not expose backend implementation details unnecessarily.**
15. **The ticket reference is always easy to find.**
16. **Every page has a clear primary action.**
17. **Color is never the only way to communicate state.**
18. **The design should optimize operational efficiency over
    decoration.**
19. **The UI must reflect the actual authorization model.**
20. **The design system is the single source of truth for visual and
    interaction decisions.**

------------------------------------------------------------------------

# 69. Implementation Order

## Phase 1 --- Foundation

1.  Tokens
2.  Typography
3.  Application shell
4.  Sidebar
5.  Header
6.  Buttons
7.  Inputs
8.  Badges

## Phase 2 --- Authentication & Access

1.  Login
2.  Role-aware navigation
3.  Permission-aware actions
4.  Site-aware selectors

## Phase 3 --- Ticket Core

1.  Ticket list
2.  Ticket filters
3.  Raise ticket
4.  Ticket detail
5.  Ticket conversation
6.  Timeline
7.  Attachments
8.  Acknowledgement
9.  Follow-up
10. Status change
11. Completion
12. Reopen

## Phase 4 --- Administration

1.  Sites
2.  Users
3.  User-site assignment
4.  Roles
5.  Permission matrix

## Phase 5 --- Insights

1.  Role-specific dashboards
2.  Site-wise analytics
3.  Reports

## Phase 6 --- Quality

1.  Accessibility
2.  Responsive behavior
3.  Loading states
4.  Empty states
5.  Error states
6.  Keyboard navigation
7.  Permission edge cases
8.  Internal visibility verification

------------------------------------------------------------------------

# 70. Final Design Quality Checklist

Before shipping every screen:

-   [ ] Does the screen match the user's role?
-   [ ] Does the data respect site scope?
-   [ ] Are actions permission-aware?
-   [ ] Is the primary action obvious?
-   [ ] Is the ticket/reference context clear?
-   [ ] Are status and priority understandable?
-   [ ] Are internal and client-visible elements clearly separated?
-   [ ] Are unsupported features absent?
-   [ ] Are loading, empty, and error states implemented?
-   [ ] Are hover, focus, disabled, and active states implemented?
-   [ ] Is the screen keyboard accessible?
-   [ ] Does it work on tablet/mobile?
-   [ ] Does it use the shared design tokens?
-   [ ] Does it use the actual SiteVoice terminology?
-   [ ] Does it follow the implemented ticket lifecycle?
-   [ ] Does it avoid unnecessary visual decoration?
-   [ ] Does it look like the same product as every other screen?

------------------------------------------------------------------------

# 71. Source of Truth

This design specification is derived from the SiteVoice architecture and
should be updated whenever the underlying domain model, permission
model, or ticket lifecycle changes.

The architecture currently establishes:

-   Roles and permissions
-   User-to-site assignment
-   Site-to-ticket ownership
-   Client ticket creation
-   Ticket acknowledgement
-   Ticket logs
-   Internal visibility
-   Attachments
-   Ticket types
-   Ticket priorities
-   Ticket statuses
-   Role-specific workflows
-   Permission-scoped authorization

Any future UI feature must first be checked against the corresponding
domain capability before being introduced into the design system.
