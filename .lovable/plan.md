

## Plan: Filter Out Already-Existing Clients from MikroTik Import

### Overview
Update the Import page to exclude PPP users whose `name` (PPP ID) already exists in the `clients` table (`username` column). This way only un-imported users are shown.

### Approach
In `src/pages/dashboard/mikrotik/Import.tsx`, after fetching `mikrotik_clients`, also fetch all `username` values from the `clients` table. Then filter out any `mikrotik_clients` row where `c.name` matches an existing client's `username`.

### Changes — `src/pages/dashboard/mikrotik/Import.tsx`

1. Add a new `useQuery` to fetch existing client usernames:
   ```typescript
   const { data: existingUsernames = [] } = useQuery({
     queryKey: ["existing_client_usernames"],
     queryFn: async () => {
       const { data } = await supabase.from("clients").select("username");
       return (data || []).map(c => c.username?.toLowerCase());
     },
   });
   ```

2. Update the filtering logic to exclude matches:
   ```typescript
   const filtered = clients
     .filter((c: any) => !existingUsernames.includes(c.name?.toLowerCase()))
     .filter((c: any) =>
       [c.name, c.caller_id, c.server_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
     );
   ```

### Files
- 1 file edited: `src/pages/dashboard/mikrotik/Import.tsx`

