# Game Guide Hub

A free website (hosted on GitHub Pages) that collects your YouTube guide videos by game and guide type, with clickable location maps.

Embedded videos still count as YouTube views on your channel.

---

## 1. Put it on GitHub (one time, ~10 minutes)

1. Sign in at **github.com** → click **+** (top right) → **New repository**.
2. Name it (e.g. `guides`), set it to **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Unzip this project on your computer, open the folder, select **everything inside it** (not the folder itself) and drag it into the upload box. Click **Commit changes**.
   - Make sure `.nojekyll` gets uploaded too. If your computer hides it, that's OK — the site still works.
5. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, then **Save**.
6. Wait 1–2 minutes. Your site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## 2. Make it yours (edit these files on GitHub — click the file, then the ✏️ pencil)

**`data/site.json`** — channel name, tagline and links:
- `channelName`, `tagline`
- `repo`: already set to `JTFive/game-guides`. Change it only if you rename the repo.
- `socials`: paste your links; leave `""` to hide one

**`data/games.json`** — your list of games. Each game:
```json
{
  "id": "aion-2",
  "name": "AION 2",
  "tagline": "Short description",
  "cover": "images/aion-2.jpg",
  "accent": "#5ec8f2",
  "maps": [ { "id": "world", "name": "World Map", "image": "maps/aion-2-world.jpg" } ]
}
```
- `id`: lowercase, dashes, no spaces. It must match the guides file name: `data/guides/aion-2.json`.
- `accent`: the game's highlight colour.
- `maps`: any number of maps, or `[]` for none.
- `guideTypes`: each game can have its own list (MW4 DMZ does). It sets the types offered in the editor and the order they appear on the game page. A game without its own list uses the `guideTypes` at the top of the file.

**Adding a new game:** add an entry to `games.json`, then create `data/guides/<id>.json` containing just `[]`.


## 3. Images and maps

- **Cover art:** 16:9 image (800×450 or larger) in `images/`. Upload on GitHub with **Add file → Upload files**.
- **Maps:** a screenshot of the in-game map (JPG/PNG/WebP) in `maps/`. Any size works; the site reads it automatically.
- If you replace a map image with one of a **different size**, the existing pins will move — re-place them in the editor.

## 4. Adding guides on the website

Open `https://YOUR-USERNAME.github.io/REPO-NAME/editor.html` and bookmark it. It isn't linked from the public site.

**First time: sign in**
1. Click **Sign in to save** → **I own the site** and follow the steps shown (they create a GitHub token limited to this one repo).
2. Paste the token and click **Sign in**. You stay signed in on that device until you sign out or the token expires.

**Every time**
1. Pick the game. Fill in the mission/quest/task name, type, YouTube link and location, and click the map to drop a pin.
2. Click **Add to list**. Repeat for as many guides as you like.
3. Click **Save changes to site**. It goes live in about a minute.

Unsaved changes stay in your browser, so you can build up a batch over several sessions. Saving in batches is better than one guide at a time, because GitHub Pages limits how often a site can rebuild per hour.

## 5. Moderators

**Adding a moderator**
1. They need a free GitHub account.
2. In your repo: **Settings → Collaborators → Add people** → enter their GitHub username.
3. They accept the invite (by email or on GitHub), open the editor, click **Sign in to save → I'm a moderator** and follow the steps.

**Removing a moderator:** Settings → Collaborators → remove them. They can't save anymore from that moment.

**Who can save?** Only you and your collaborators. Anyone else who opens the editor gets "doesn't have edit access" and can't change anything.

**Who changed what?** Every save is recorded on GitHub under the person's name. To see it, open the repo → **Commits**. Any change can be undone from there.

If two people save at the same time, the editor merges both sets of changes automatically.

Moderators have full write access to the repo, so only add people you trust.

**If you'd rather not sign in** on a particular computer, the editor's "Publish manually" section lets you copy the file and paste it into GitHub instead.

**Tips**
- **Order #** controls story order (Main Quest 1, 2, 3…). Leave blank for things where order doesn't matter.
- A YouTube link with a timestamp (`?t=1m30s`) starts the embedded video at that point — handy for pointing at one part of a long video.
- You can leave the YouTube link empty to list a guide as "Video coming soon".

## Files

```
index.html     home: games + latest guides + search
game.html      one game: guides by type, filters, map tab
guide.html     one guide: video, notes, location map, prev/next
editor.html    sign-in editor for you and your moderators
data/          ← all your content lives here
images/ maps/  ← your pictures
assets/        styles and code (no need to touch)
```
