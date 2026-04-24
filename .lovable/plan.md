
## TopBar পরিষ্কার + "অ্যাপ ইনস্টল" option ঠিক করা

### সমস্যা যা বুঝলাম
**১. "Quick Add" button** — উপরের bar-এ "+ দ্রুত যোগ" নামের যে নীল button আছে (client দ্রুত যোগ করার dialog খোলে), সেটা remove করতে চান।

**২. "App Install" option কোথায় বুঝতে পারছেন না** — কারণ এটা এখন ৩টা সমস্যায় পড়ছে:

| কোথায় | কী হচ্ছে |
|---|---|
| User dropdown menu-তে "অ্যাপ ইনস্টল" item | `InstallAppButton` ভেতরে আছে যা **`canShow=false` হলে নিজেকে hide করে দেয়**। ফলে label "অ্যাপ ইনস্টল" থাকলেও পাশের button **invisible** — দেখে মনে হয় অপশনই নেই। |
| Browser-এ install না হলে | Chrome `beforeinstallprompt` event fire না করা পর্যন্ত button দেখাবে না |
| iOS-এ | শুধু Safari-তে দেখা যায়, অন্য browser-এ নয় |

মূলত: button আছে কিন্তু conditional, তাই **আপনি দেখতেই পাচ্ছেন না**।

### Plan

**A) Quick Add সম্পূর্ণ remove (`src/components/TopBar.tsx`)**
- `Plus` icon import সরাবো
- "Quick Add" `<Button>` block (line ৮৩–৯২) মুছে দেবো
- `quickAddOpen` state এবং `<QuickCreateClientDialog>` render সরিয়ে দেবো
- `QuickCreateClientDialog` import সরিয়ে দেবো (component file রেখে দেবো — অন্য জায়গায় import হলে ভাঙবে না, পরে cleanup করা যাবে)

**B) "অ্যাপ ইনস্টল" option-কে সবসময় কাজ করার মতো করে redesign**

User dropdown-এ এখন যে complicated row আছে সেটা সরল করবো — একটা **স্পষ্ট menu item** বসাবো যেটা **সবসময় দেখা যাবে**:

```
👤 প্রোফাইল
📝 আমার নোট                          [icon]
─────────
🌐 ভাষা                              বাং >
🎨 থিম মোড                          [light/dark toggle]
🎨 থিম কাস্টমাইজার
⚙️  কুইক সেটিংস
─────────
🌍 ওয়েবসাইটে যান
📱 অ্যাপ ইনস্টল করুন           ← সবসময় visible (smart click)
─────────
🚪 সাইন আউট
```

**আচরণ — `Install App` menu item click করলে:**
- যদি browser native prompt support করে (Chrome/Edge desktop+Android) → সরাসরি native install dialog
- যদি iOS Safari হয় → "Share → Add to Home Screen" instruction dialog
- যদি already installed (standalone mode) → একটা friendly toast: "✅ অ্যাপ আগে থেকেই ইনস্টল করা আছে"
- যদি browser support না করে → instruction toast: "এই browser-এ install support করে না — Chrome/Edge ব্যবহার করুন"

এতে user-এর কাছে মনে হবে option **always available**, behind-the-scene logic browser বুঝে নেবে।

**Implementation:**
- `useInstallPrompt` hook-এ `installed` state already export হয় — সেটা ব্যবহার করবো
- TopBar-এ `InstallAppButton` import-এর পরিবর্তে সরাসরি hook + একটা simple `DropdownMenuItem` ব্যবহার করবো যাতে hide না হয়
- iOS instruction dialog আগের `InstallAppButton`-এ যা ছিল সেটা একটা ছোট self-contained piece হিসেবে TopBar-এ inline করবো (অথবা `InstallAppButton` কে refactor করে "always render"-এর support যোগ করবো)

### Files যা change হবে
| File | কাজ |
|---|---|
| `src/components/TopBar.tsx` | Quick Add button + state + dialog + import remove। User menu-তে "অ্যাপ ইনস্টল করুন" সবসময় visible করা, smart handler সহ |
| `src/components/InstallAppButton.tsx` | নতুন optional prop `alwaysRender` যোগ — `canShow=false`-এ null না দিয়ে disabled-state বা friendly fallback toast দেবে |

কোনো DB/dependency change নেই।

### Outcome
- ✅ TopBar থেকে নীল "+ দ্রুত যোগ" button সম্পূর্ণ চলে যাবে
- ✅ User menu (ডান দিকের avatar) → **"📱 অ্যাপ ইনস্টল করুন"** — সবসময় দেখা যাবে, click করলে appropriate behavior (native prompt / iOS instructions / friendly message)
- ✅ Mobile portal/reseller shell-এর icon variants যেগুলো এখন আছে সেগুলোও কাজ করবে (যদি প্রয়োজন হয়, ওগুলোকেও `alwaysRender` দিয়ে visible রাখা যায় — কিন্তু আপাতত শুধু TopBar-ই scope)
