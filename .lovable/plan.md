## Static-protocol client form: replace Username/Password with IP/MAC fields

When `protocol_type === "Static"` the AddClient form should hide `Username`, `Password`, `Remote Address` and instead show three fields. Client code (client_id) remains as is — needed for billing.

### Conditional fields (Static only)

| Field | Maps to existing column | Example |
|------|------------------------|---------|
| Static IP / Subnet * | `clients.static_ip` (existing) | `192.168.10.25/24` |
| রাউটার MAC Address | `clients.mac_address` (existing) | `AA:BB:CC:11:22:33` |
| গেটওয়ে / Peer IP | `clients.peer_ip` (existing) | `192.168.10.1` |

No new DB columns needed — all three target columns already exist on `clients`.

### Save logic
In `saveMutation`, when `protocol_type === "Static"`:
- send `username = null`, `password = null`, `remote_address = null`
- always send `static_ip`, `mac_address`, `peer_ip` (currently `static_ip`/`peer_ip` are gated by `client_type === "Corporate"` — drop that gate when protocol is Static)
- skip MikroTik PPPoE secret sync (`shouldSyncMikrotik` already requires `username`, so this is automatic)

### File
- edit `src/pages/dashboard/clients/AddClient.tsx` — swap field block + adjust save payload
