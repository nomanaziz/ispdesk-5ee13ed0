

## Plan: Merge OLT Care Features into Single ERP Platform

Based on exploring panel1.oltcare.com, the OLT Care software has 18 pages across 5 groups. Most of these map to or enhance existing modules. Here is the merge strategy and new pages needed.

### OLT Care Feature Map vs Our ERP

| OLT Care Page | Merge Into | Action |
|---|---|---|
| Home (Dashboard) | Dashboard > OLT Overview | Enhance existing OLT Overview page with OLT/ONU/DB stats, Switch List widget |
| ONU List | OLT Management > ONU | **New page** — filterable ONU table with status badges |
| OLT List | OLT Management > OLT | Already exists (enhance with detail view) |
| User Down Count | OLT Management > User Down Count | **New page** — shows users with down ONUs |
| ONU Fiber Down Finder | OLT Management > Fiber Down Finder | **New page** — fiber-down ONU detection tool |
| SHARE | OLT Management > OLT Sharing | **New page** — manage OLT branch sharing |
| Add SWITCH | Network Monitoring > Add Switch | **New page** — add network switches |
| SWITCH List | Network Monitoring > Switch List | **New page** — switch inventory + status |
| POP DASS | Network Monitoring > POP DASS | **New page** — POP power monitoring (Generator/Electric up/down) |
| POP IP | Network Monitoring > POP IP | **New page** — POP IP address management |
| POP LOG | Network Monitoring > POP Log | **New page** — POP event/activity logs |
| PING TOOLS | Network Monitoring > Ping Tools | **New page** — add IP targets, run ping checks |
| POP | Network Monitoring > POP | **New page** — POP device list + management |
| Users | System > App Users | Already exists |
| Roles | System > Roles | **New page** — role management |
| OLT Permissions | System > OLT Permissions | **New page** — assign OLT access per user |
| Branch | Branch Office > Branches | Already exists (enhance) |
| SYS LOG | System > System Log | **New page** — system activity audit log |
| PACKAGE | Config > Package | Already exists |
| Service | Config > Service | **New page** — service type config |

### Sidebar Changes

**Expand "OLT Management"** from 2 items to 6:
- OLT Devices (existing)
- ONU List (new)
- OLT Users (existing)
- User Down Count (new)
- Fiber Down Finder (new)
- OLT Sharing (new)

**Add new group "Network Monitoring"** (between OLT Management and Network Diagram):
- Switch List
- Add Switch
- POP DASS
- POP IP
- POP Log
- Ping Tools
- POP Devices

**Expand "System"** — add 3 items:
- Roles
- OLT Permissions
- System Log

### OLT Overview Dashboard Enhancement

Rebuild `src/pages/dashboard/OltOverview.tsx` with full widgets from OLT Care home:
- **Row 1**: OLT count | OLT Port count | OLT 24+ dB count | OLT Offline ONU count
- **Row 2**: dB List grid (dB 24-31+ buckets with color-coded counts)
- **Row 3**: Switch List widget (paginated table with status)

### New Database Tables

```sql
CREATE TABLE switches (id, name, ip_address, model, port_count, status, branch_id, pop_id, created_at);
CREATE TABLE pop_devices (id, name, ip_address, type, generator_status, electric_status, branch_id, created_at);
CREATE TABLE pop_ip_addresses (id, pop_id, ip_address, subnet, gateway, status, assigned_to, created_at);
CREATE TABLE pop_logs (id, pop_id, event_type, message, created_at);
CREATE TABLE ping_targets (id, name, ip_address, interval_seconds, last_status, last_ping_at, created_at);
CREATE TABLE system_logs (id, user_id, action, module, details, created_at);
CREATE TABLE service_types (id, name, description, status, created_at);
```

### Files to Create (13 new pages)

```
src/pages/dashboard/olt/OnuList.tsx
src/pages/dashboard/olt/UserDownCount.tsx
src/pages/dashboard/olt/FiberDownFinder.tsx
src/pages/dashboard/olt/OltSharing.tsx
src/pages/dashboard/monitoring/SwitchList.tsx
src/pages/dashboard/monitoring/AddSwitch.tsx
src/pages/dashboard/monitoring/PopDass.tsx
src/pages/dashboard/monitoring/PopIp.tsx
src/pages/dashboard/monitoring/PopLog.tsx
src/pages/dashboard/monitoring/PingTools.tsx
src/pages/dashboard/monitoring/PopDevices.tsx
src/pages/dashboard/system/Roles.tsx
src/pages/dashboard/system/OltPermissions.tsx
src/pages/dashboard/system/SystemLog.tsx
src/pages/dashboard/config/ServiceTypes.tsx
```

### Files to Edit

- `src/pages/dashboard/OltOverview.tsx` — full rebuild with OLT/ONU/dB/Switch widgets
- `src/components/AppSidebar.tsx` — expand OLT Management, add Network Monitoring group, expand System
- `src/App.tsx` — register 15 new routes
- Database migration — create 7 new tables with RLS policies

### Implementation Order

1. Database migration (7 new tables)
2. Create 15 new placeholder page files
3. Update sidebar with expanded OLT Management + new Network Monitoring group
4. Update App.tsx routes
5. Rebuild OLT Overview dashboard with full widgets

