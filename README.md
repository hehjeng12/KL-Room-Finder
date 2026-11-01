# KL Room Finder

A room rental listing website for Kuala Lumpur, built for a part-time room rental role. Prospective tenants browse real photos and video tours of 375 rooms across 31 properties, then enquire through WhatsApp, Instagram or rednote (小红书). Each enquiry is pre-filled with the room they were viewing.

**Live site:** https://kl-room-finder.pages.dev

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, hand-written CSS (responsive, mobile-first) |
| Backend / build tool | C# on .NET (ASP.NET Core minimal API), SkiaSharp for image processing |
| Hosting | Cloudflare Pages (static files) plus a Cloudflare Pages Function |

## Key features

- **Folders as the database:** the C# backend scans a `Property / Unit / Room` folder tree of photos and videos and builds the catalogue automatically, including room-type classification (Master, Middle, Single, Balcony, Partition…). New batches can live in separate folders that are merged into one catalogue, and duplicate file copies are filtered out.
- **Image pipeline:** multi-megabyte phone photos are resized to 480 / 960 / 1600 px JPEGs, with EXIF orientation applied, and cached.
- **Browsing:** search, filters (area, room type, property, has video, hide taken), a gallery and full-screen lightbox with keyboard and swipe support, and shareable links for each room and each area.
- **Saved-rooms shortlist:** visitors save up to 10 rooms (kept in their own browser) and ask about all of them in one WhatsApp message.
- **Contact:** WhatsApp and Messenger links with a pre-filled enquiry message (the room or rooms, plus a short details form), and a rednote QR card (rednote doesn't support pre-filled messages).

## Engineering decisions

- **Static export for free hosting:** the same C# project can run as a live API, or export the whole site as static files (`dotnet run -- export`). That lets about 1 GB of media be hosted on Cloudflare Pages' free plan with no server to pay for.
- **Video seeking on a static host:** Cloudflare Pages ignores HTTP `Range` requests, which stopped browsers seeking in videos and can stop Safari on iPhone playing them at all. A small Pages Function (`functions/v/[file].js`) returns `206 Partial Content` for video requests only, so photos don't use the free function quota.
- **Two-phase enquiries:** the site is for browsing. Price, male/female unit and availability change daily in a shared agents' sheet, so they are confirmed on WhatsApp rather than published, and every room page says so.
- **Configuration out of source:** personal contact details live in a git-ignored `appsettings.Local.json`, and prices and availability live in `listings.json`, so non-developers can update them without touching code.

---

The rest of this README is the operating guide: how to update listings and publish.

```
House Renting Information/          ← your photos & videos (the backend reads these directly)
├── Vierra/B-11-15/Master Room 1/…
├── …
└── website/
    ├── client/                     ← FRONTEND: React + TypeScript (Vite)
    ├── server/RoomRental.Api/      ← BACKEND: C# (.NET 7)
    │   ├── appsettings.json        ← brand name, copyright text (public)
    │   ├── appsettings.Local.json  ← your contact details (private, not in git)
    │   └── Data/listings.json      ← prices, availability, property info
    ├── functions/v/[file].js       ← Cloudflare function that lets videos seek / play on iPhone
    ├── publish.cmd                 ← build + publish to Cloudflare in one command (use this one)
    ├── publish-static.ps1          ← same, for PCs that allow unsigned PowerShell scripts
    └── deploy/                     ← generated files that get uploaded (don't edit by hand)
```

## How it works

- **The folders are the database.** The API scans the folder: `Property / Unit / Room / files`. Folders named like a unit number (`A-11-07`, `09-03`, `D3-26-08`) become units. Folders with "Common" or "Toilet" in their name become the unit's shared spaces. Everything else becomes a rentable room. If a property has no unit folders (D_Quince, Nest 2, PJS7, …), its rooms are grouped into a single unit.
- To add a listing, drop a new folder in. To remove one, delete or move its folder. For the **live site**, then run `.\publish.cmd deploy` (see below). When running locally with the C# server, changes show up within 30 seconds.
- Phone photos (several MB each) are resized to web-sized JPEGs on first view and cached in `App_Data/thumbs`. Videos are streamed with range requests, so visitors can seek without downloading the whole file.
- Room types (Master, Middle, Single, Balcony, Partition, Studio…) are worked out from the folder name. They drive the filters.

## Before you go live: fill these in

### 1. Contact details: `server/RoomRental.Api/appsettings.Local.json` (private)

Your real contact details go in `appsettings.Local.json`. It's git-ignored, so it never reaches GitHub, and its values override the empty ones in `appsettings.json`. Create it if it doesn't exist:

```json
{
  "Site": {
    "AgentName": "Your name",
    "WhatsAppNumber": "60123456789",
    "FacebookUrl": "https://www.facebook.com/yourpage",
    "MessengerUsername": "yourpage",
    "InstagramUsername": "yourhandle",
    "RednoteId": "1234567890",
    "RednoteUrl": "",
    "RednoteQrImage": "/rednote-qr.png"
  }
}
```

The rednote QR image (`client/public/rednote-qr.png`) is git-ignored for the same reason. Keep a copy of both files somewhere safe: a fresh clone of the repository won't have them.

Brand name, tagline and copyright text stay in the public `appsettings.json`.

**Enquiry form.** `EnquiryTemplate` in `appsettings.json` is the short form added under every enquiry (WhatsApp, Messenger, and the copied Instagram and rednote message). Edit the text, keeping `\n` for each new line, then publish. Ask for anything more sensitive, such as race, nationality or occupation, later on WhatsApp rather than in the first message.

**Extra media folders.** New batches of rooms can live in their own folder, with the same `Property / Unit / Room` layout, instead of being copied into the main one. List them in `appsettings.Local.json`:

```json
"Media": { "ExtraRootPaths": [ "C:/Room Renting V2" ] }
```

A property found in more than one folder (for example `Vierra` in both) is merged into one listing. Identical copies of a file in the same room folder, such as `photo.jpg` and `photo(1).jpg`, are shown once. Folders downloaded from Google Drive as `.zip` files must be extracted first.

- rednote (小红书) has no pre-filled message links, so its button opens a card with your QR code (`client/public/rednote-qr.png`), your ID (tap to copy) and a "copy enquiry message" button. `RednoteUrl` is optional: in the app, go to *Profile → Share → Copy link* and paste the link here to add an "Open my profile" button.

- `WhatsAppNumber`: international format, digits only (Malaysia = `60` + number without the leading 0).
- Leave a field empty to hide that button. Instagram doesn't allow pre-filled DMs, so the site copies the enquiry to the visitor's clipboard instead.

### 2. Prices, availability and property info: `server/RoomRental.Api/Data/listings.json`

Every property already has an entry. Fill in whatever you have:

```json
"properties": {
  "Vierra": {
    "displayName": "Vierra",
    "area": "Area, City",
    "address": "",
    "description": "Short paragraph about the condo.",
    "highlights": ["Near MRT", "Swimming pool", "Gym"],
    "mapUrl": "https://maps.google.com/?q=...",
    "priceFrom": 650,
    "hidden": false
  }
},
"rooms": {
  "Vierra/B-11-15/Master Room 1": { "price": 900, "status": "available", "notes": "Attached bathroom, available 1 Dec" }
}
```

- Room keys are the folder path below *House Renting Information*, using `/`.
- `status`: `available`, `reserved` or `taken`. Taken rooms stay visible but greyed out, and visitors can hide them with a filter.
- Rooms without a price show **"Contact for price"**, which is also a good prompt for people to message you.
- `"hidden": true` removes a property from the site without deleting its folder.
- `area`: shown on cards and pages, and used by the area filters. Write it as "Area, City", for example `"Bukit Jalil, Kuala Lumpur"`. The area buttons show the part before the comma. All 31 properties have one, researched from PropertyGuru.

## Running it locally

Requirements: .NET SDK 7+ and Node.js 18+.

```bash
cd website/server/RoomRental.Api
dotnet run --urls http://localhost:5080
```

```bash
cd website/client
npm install
npm run dev
```

Open http://localhost:5173. The React dev server forwards `/api` calls to the C# API.

## Going live for free (Cloudflare Pages)

The free plan needs no credit card and has no bandwidth charges. In free mode the C# project runs only on your PC: it exports the site as ready-made files (`website/deploy`, about 1 GB), and Cloudflare serves them.

**One-time setup**

1. Create a free account at https://dash.cloudflare.com/sign-up (just email and password; no payment details needed for Pages).
2. Sign in once. This opens a browser window where you approve access. Use `npx.cmd` rather than `npx`, because PowerShell on this PC blocks `npx.ps1`:

   ```powershell
   cd "C:\House Renting Information\website\client"
   npx.cmd wrangler login
   ```

   The Pages project `kl-room-finder` already exists. It was created with `npx.cmd wrangler pages project create kl-room-finder --production-branch main`.

**Publish (and every time you update photos, settings or listings)**

```powershell
cd "C:\House Renting Information\website"
.\publish.cmd deploy
```

The live site is **https://kl-room-finder.pages.dev**. Later runs upload only changed files. `.\publish.cmd` without `deploy` builds without uploading. On a PC that allows unsigned PowerShell scripts, `.\publish-static.ps1 -Deploy` does the same.

**Visitor numbers (optional, free):** in the Cloudflare dashboard, go to **Workers & Pages → kl-room-finder → Metrics** and enable **Web Analytics**, then publish once. It shows visits, top pages and where visitors came from, and it uses no cookies.

Why `publish.cmd` and not `publish-static.ps1`: this PC only runs signed PowerShell scripts (`...is not digitally signed`), and that rule doesn't apply to `.cmd` files. Both do the same steps. To run the steps by hand instead:

```powershell
cd "C:\House Renting Information\website\client"
npm.cmd run build:static
dotnet run --project ..\server\RoomRental.Api -- export ..\deploy
cd ..
client\node_modules\.bin\wrangler.cmd pages deploy deploy --project-name kl-room-finder --branch main
```

The last command must run from the `website` folder, not `client`, so the video function in `functions` is uploaded too.


**Video playback:** Cloudflare Pages serves static files without HTTP Range support, which stops browsers jumping ahead in videos and can stop iPhones playing them at all. The small Pages Function in `functions/v/[file].js` answers those requests for videos (served from `/v/`). Only videos are routed to it (`client/public/_routes.json`), so photos don't count towards the free plan's 100,000 function requests a day. Always deploy from the `website` folder (as `publish-static.ps1` does) so the function is included.

**Free plan limits:** 25 MB per file and 20,000 files. The export skips videos over 25 MB and lists them in the output. These 3 are skipped at the moment:

- `Sunway Belfield (Actual)/A-43-10 (4 ROOMS)/IMG_2296.MOV` (1 GB)
- `Sunway Belfield (Actual)/B-35-08 (3 ROOMS)/Common Area/IMG_4403.MOV` (27 MB)
- `The Arcuz/28-13A/Common Area/IMG_1899.MOV` (40 MB)

To include them, compress each one below 25 MB (for example with the free HandBrake app, or by sending it to yourself on WhatsApp and saving the compressed copy), replace the file in its folder, and publish again.

## Production build with the C# server (optional, needs paid hosting)

```bash
cd website/client
npm run build
```

This writes the React app into `server/RoomRental.Api/wwwroot`, so the API alone serves the whole site:

```bash
cd website/server/RoomRental.Api
dotnet publish -c Release -o ../../publish
```

When deploying, copy the media folders to the server too. Then set `Media:RootPath` to wherever they live, either in `appsettings.json` or with the environment variable `Media__RootPath=/var/www/rooms-media`.

## Known limitations

- `Sunway Belfield (Actual)/A-43-10 (4 ROOMS)/IMG_2296.MOV` is HEVC (H.265). It plays in Safari and Edge but may not play in Chrome or Firefox on Windows. Re-export it as H.264 if needed. The other 99 videos are H.264 and play everywhere.
- Some photos are reused across units (for example Petalz A-20-01 and A-22-12, Vierra A-29-20 and A-32-10). Check that each unit shows its own room.
- .NET 7 is out of Microsoft support. Moving the project to .NET 8 or later (change `TargetFramework` to `net8.0` and install the .NET 8 SDK) is recommended before public hosting.
- The site is a single-page app, so link previews on WhatsApp and Facebook show the generic site title rather than the specific room.
