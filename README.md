# Shimmer & Spark

*Select a vial to ignite the night.*

Our date ideas, sorted into three glowing vials: **Outside**, **Indoor** and **Staying Home**.
Tap a vial, pick tonight's vibe and shake it to draw a date, or browse the list. When you both tap
"I'm in", pick a day for it.

Without Supabase keys the app runs in **demo mode** (data stays in that browser only, and the Us tab
lets you switch between "You" and "Partner" to try the flow).

## Files

| File | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app |
| `config.js` | Your Supabase URL and public key go here |
| `supabase/schema.sql` | Database tables, security rules and picture storage |
| `manifest.webmanifest`, `sw.js`, `assets/icon-*.png` | Lets you install it on your phone like an app |
| `assets/home.jpg` | The home screen picture |

## 1. Set up Supabase (free plan)

1. Go to [supabase.com](https://supabase.com), sign up and create a new project. Any name and region work.
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql` and press **Run**.
3. In the left sidebar, click **Authentication**, then **Sign In / Providers**. Click **Email** in the
   list of providers, switch off **Confirm email**, and press **Save**. You don't need to set up SMTP
   or edit any email templates: the app signs in with an email and password, so Supabase never has to
   send an email.
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key into
   `config.js`.

## 1b. Turn on "Continue with Google" (optional)

The Google button stays hidden until Google is switched on in Supabase. Email and password keep working
either way.

1. Go to [console.cloud.google.com](https://console.cloud.google.com), sign in with your Google account
   and create a new project (for example "Shimmer & Spark").
2. In the search bar type **Google Auth Platform** and open it. Click **Get started**, and fill in:
   app name "Shimmer & Spark", your email as support email, audience **External**, and your email as
   contact. Accept and create.
3. Open **Audience** in the left menu and press **Publish app**, so anyone you share the link with
   (your partner) can sign in. The app only asks Google for name and email, so Google doesn't need to
   review it.
4. Open **Clients** → **Create client**. Choose **Web application** and name it "Shimmer & Spark".
   - Under **Authorized JavaScript origins**, add `https://acruzale.github.io` and
     `http://localhost:5174`.
   - Under **Authorized redirect URIs**, add exactly
     `https://tgmsobzusteifruvxagr.supabase.co/auth/v1/callback`.
   - Press **Create**. Copy the **Client ID** and **Client secret** that appear.
5. In Supabase, open **Authentication → Sign In / Providers → Google**. Switch it on, paste the Client ID
   and Client secret, and save.
6. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to
   `https://acruzale.github.io/Shimmer-Spark/`. Under **Redirect URLs**, add `https://acruzale.github.io/**`
   and `http://localhost:5174/**`.

On iPhone, Google sign-in can finish in Safari instead of the app installed on your home screen. If
that happens, sign in once inside the installed app with email and password instead.

## 2. Put it on GitHub Pages

The repository is [acruzale/Shimmer-Spark](https://github.com/acruzale/Shimmer-Spark).

1. Push this folder to the repository. `.gitignore` keeps the Google secret file
   (`ClientGoogleOAuth.json`) and local settings out of it: never upload that file.
2. In the repository, open **Settings → Pages**, set **Source** to "Deploy from a branch", pick `main`
   and `/ (root)`, and save. After a minute the app is at
   **https://acruzale.github.io/Shimmer-Spark/**.
3. Back in Supabase, open **Authentication → URL Configuration** and set **Site URL** to that address.

GitHub Pages on the free plan needs a public repository, so anyone could see the code and the home
picture. Your date ideas stay private: they live in Supabase behind sign-in.

## 3. Start using it

1. Open the link on your phone and tap **Continue with Google**, or choose **Create account** and enter
   your email and a password.
2. Choose **Start ours**. The Us tab shows an invite code.
3. Send your partner the link and the code. They create their own account and choose
   **I have an invite code**.
4. Install it: on iPhone, Safari → Share → **Add to Home Screen**. On Android, Chrome → ⋮ → **Install app**.

### Saving reels from Telegram or Instagram

- **Android:** after installing, tap Share on a reel (or long-press a link in Telegram → Share) and pick
  **Shimmer & Spark**. The add form opens with the link filled in.
- **iPhone:** copy the link, open the app, tap **+** and then **Paste**.

Instagram, TikTok and YouTube links play inside the app. Adding a screenshot as the cover helps you
recognize the idea in the list.

### Planned dates

When you're both in, pick a day in the app. The date shows on the idea, in Plans under Both in, and on the home screen on the day and the day before. Everything stays in the app, so a change by either of you shows up for both.

## Changing things later

- **Font:** the headings use Federo, a free Art Deco font close to the Arcane look. To use your own
  font file, put it in `assets/`, add an `@font-face` rule at the top of `styles.css` and put its name
  first in `--font-display`.
- **Vial positions:** `VIAL_POS` and `stringY` near the top of `app.js` set where each vial hangs.
- **After editing files,** change `VERSION` in `sw.js` so installed copies pick up the update.
