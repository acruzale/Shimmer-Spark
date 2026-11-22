# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One couple: the owner and her partner. Nobody else is planned to use it. Each signs in with their own account (Google or email and password) and both share one private set of vials, joined with an invite code. They use it mostly on their phones, installed to the home screen, often in the evening while deciding what to do.

## Product Purpose

Shimmer & Spark is a private app for one couple to collect date ideas, mostly reels shared from Instagram and Telegram. Ideas go into three vials (Outside, Indoor, Staying Home), each with sub-vibes. They draw one at random by vibe, or pick from the list. When both are "in" on an idea, they pick a day and add a calendar reminder. Past dates are kept with memories, so they remember the dates they've had and don't feel like they never go out.

Success: they actually go on the dates they save, and can look back on the ones they've had.

## Positioning

It replaces a set of real jars with coloured paper slips: one jar per energy (Outside, Indoor, Staying Home), and a slip colour per vibe. The digital version keeps that ritual (reach into the jar that fits tonight's energy and draw) and adds what jars cannot: the source reel, the place, both partners saying "I'm in", a day with a reminder, and a record of dates already had.

## Operating Context

- Ideas arrive as Instagram reels and other links, usually shared in Telegram. They are added by pasting a link (or via the Android share menu once installed), with an optional screenshot as a cover.
- Places are saved as a name and an optional Google Maps link.
- Some ideas are time-limited events (seasonal ice rinks, exhibitions) with a last day.
- Reminders go to each partner's own calendar (.ics file or Google Calendar link).

## Capabilities and Constraints

- Static site (HTML, CSS, JavaScript, no build step) hosted on GitHub Pages at https://acruzale.github.io/Shimmer-Spark/, installable as a home-screen web app.
- Data, sign-in and cover pictures in Supabase (free plan); row-level security keeps each couple's vials private.
- Three vials with fixed sub-vibes. Outside: Chill & relaxed, Hiking, Active, Day trips. Indoor: Leisure & entertainment, Active & interactive. Staying Home: Chill & cozy, Culinary, Projects.
- Terms used in the app: vial, vibe, "I'm in", Plans, Previous dates, memory, last day.
- Instagram, TikTok and YouTube links play inside the app; other links open in a new tab.
- A local demo mode runs without Supabase when the config is empty.

## Brand Commitments

- Name: Shimmer & Spark. Home tagline: "Welcome to Shimmer & Spark" / "Select a vial to ignite the night".
- Inspired by the series Arcane (Zaun and Piltover): the containers are shimmer vials and stay called vials. The owner chose and supplied the reference imagery (home scene, vibe pictures, vial concept art, Arcane soundtrack cover and character palettes).
- The "Shimmer & Spark" title keeps its brass, Arcane-style lettering (user confirmed).
- Cozy and warm, not flashy. Visual changes are made on request by the owner.

## Evidence on Hand

- Home picture: `assets/home.jpg`. Vibe banner pictures: `assets/vibes/*.jpg` (owner supplied).
- Real ideas live in Supabase; the app ships no testimonials, users or claims, and none should be invented.

## Product Principles

- The draw is the heart: choosing tonight's vibe and drawing from a vial should feel like a small ritual, never a form.
- Both voices count: an idea becomes a plan only when both partners are in.
- Remember what you did: past dates and memories are kept and easy to look back on, but sit below planning.
- Capture is effortless: a pasted link is enough to save an idea.
- Private by design: the vials belong to one couple.

## Accessibility & Inclusion

No specific needs stated by either partner. Follow good general practice: readable contrast on the dark theme, tap targets sized for phones, and calmer motion when the phone asks for reduced motion.
