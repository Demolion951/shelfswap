# ShelfSwap native shells (Google Play & App Store)

The repo uses [Capacitor](https://capacitorjs.com/) so the **production website** loads inside a native **WebView** (`android/`, `ios/`). You still deploy Next.js to Vercel as today; the store apps are a thin shell around that URL.

## One-time setup

1. **Production URL**  
   Set the origin your app should open (no trailing slash), e.g.  
   `https://your-project.vercel.app`  
   Either:
   - `CAPACITOR_SERVER_URL` in `.env.local` (or your shell) when you run `cap sync`, or  
   - `NEXT_PUBLIC_SITE_URL` to the same value (reused if `CAPACITOR_SERVER_URL` is unset).

2. **Install deps**  
   `npm install`

3. **Sync web assets + native config**  
   `npm run cap:sync`  
   This writes `capacitor.config.json` into the Android/iOS projects. **Run this whenever you change `capacitor.config.ts` or `capacitor-www/`.**

## Google Play (Android)

1. Install [Android Studio](https://developer.android.com/studio).
2. `npm run cap:open:android` (or open the `android/` folder in Android Studio).
3. **Signing:** create an upload key and configure signing configs in Android Studio (Play App Signing recommended).
4. Build a **release AAB** (Build → Generate Signed Bundle / Release).
5. [Play Console](https://play.google.com/console): create the app, upload the AAB, complete Data safety, content rating, and store listing.

**Bundle ID in this repo:** `net.shelfswap.app` (see `capacitor.config.ts`). Change only before you publish if you intend a different id; changing later is treated as a new app on the store.

## Apple App Store (iOS)

1. Requires a **Mac** with **Xcode** for archiving and upload (even if you develop on Windows).
2. On the Mac: clone/pull the repo, `npm install`, set `CAPACITOR_SERVER_URL`, `npm run cap:sync`.
3. `npm run cap:open:ios` → select your **Team** in Signing & Capabilities, set a unique bundle id if you changed it from `net.shelfswap.app`.
4. **Archive** in Xcode → **Distribute App** → App Store Connect.
5. Complete privacy labels, screenshots, and review information.

`Info.plist` includes usage strings for **rough location** and **camera** (ISBN scan), matching the web app.

## Digital goods & Stripe (important)

Selling **credit packs** through **Stripe inside a WebView** may conflict with **Apple App Store** rules on digital purchases; you may need **Apple In‑App Purchase** for iOS, or a product/legal strategy reviewed with Apple’s guidelines. Plan this **before** spending time on review. Google Play has separate billing rules for certain digital goods—verify for your category.

## Useful commands

| Command | Purpose |
|--------|---------|
| `npm run cap:sync` | Copy `capacitor-www` + config into `android/` and `ios/` |
| `npm run cap:open:android` | Open Android Studio |
| `npm run cap:open:ios` | Open Xcode (macOS) |

## Local `capacitor-www/`

Minimal placeholder while the WebView loads. When `CAPACITOR_SERVER_URL` / `NEXT_PUBLIC_SITE_URL` is set, the shell opens that site instead for day-to-day use.
