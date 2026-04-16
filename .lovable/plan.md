

## সমস্যা

`create-mikrotik-ppp`-এর `mikrotikCommand` function-এ query parameter (`?name`) ভুলভাবে encode হচ্ছে।

- **fetch-mikrotik-ppp** (সঠিক): `?` দিয়ে শুরু হলে `?name=value` পাঠায়
- **create-mikrotik-ppp** (ভুল): সব param-এ `=` prefix দেয়, তাই `=?name=value` যায় — MikroTik এটা বুঝে না, empty result দেয়

ফলে existing secret check সবসময় empty আসে → `/ppp/secret/add` চলে → "already exists" error।

এছাড়া user-এর আরেকটা requirement: Import from MikroTik-এ যদি password/profile change থাকে, সেটা update করতে হবে (শুধু skip না)।

## সমাধান

### 1. `create-mikrotik-ppp/index.ts` — mikrotikCommand fix + update logic

**Query param fix** (line ~118-121):
```typescript
if (k.startsWith("?")) {
  words.push(`${k}=${v}`);  // ?name=value
} else {
  words.push(`=${k}=${v}`);  // =key=value
}
```

**Existing secret handling update**:
- Secret পাওয়া গেলে password/profile/remote_address change আছে কি না check করবে
- Change থাকলে `/ppp/secret/set` দিয়ে update করবে (`.id` ব্যবহার করে)
- Change না থাকলে শুধু success return করবে, কিছু করবে না

### 2. Frontend (`AddClient.tsx`) — কোনো change লাগবে না
Frontend already `already_exists` handle করে এবং existing data merge করে। Edge function fix-ই যথেষ্ট।

## ফাইল

| File | Change |
|------|--------|
| `supabase/functions/create-mikrotik-ppp/index.ts` | `?` param fix + existing secret update logic |

## Expected Result
- Import from MikroTik → Save → error আর আসবে না
- Secret আগে থাকলে sync হবে (change থাকলে update, না থাকলে skip)
- Secret না থাকলে নতুন create হবে

