# SuperHOME Scheduler

Built with [sveltekit](https://kit.svelte.dev/) and [tailwind](https://tailwindcss.com)

Uses [Facebook Login](https://developers.facebook.com/docs/facebook-login/web/)

Serverless hosting on [vercel](https://vercel.com)

Database on [xata](https://xata.io)

## Install

Setup [tea/cli](https://tea.xyz) first.

```bash
cd superhome-scheduler
npm install
```

Facebook Login requires https. Additional dependencies may need to be installed to enable this in your dev environment.

## Developing

```bash
npm run dev
```

## Tasks

# Setup

This will configure your connection to the database

```sh
npm install -g @xata.io/cli@latest
npm install
xata auth login
xata init
```

## Dependencies

[`tea/cli`] will automagically make these available to your environment.

| Project    | Version  |
| ---------- | -------- |
| nodejs.org | =18.15.0 |
| npmjs.com  | =8.19.3  |

[`tea/cli`]: https://github.com/teaxyz/cli

## Documentation

The scheduler supports three `categories` of reservations: pool, openwater, and classroom.

Additionally there are three possible reservation types, or `resTypes`: autonomous, course, and cbs.

Client-side code consists of three pages: root, multi-day, and single-day.

- root displays the user's own reservations
- multi-day displays a monthly calendar view, with a separate display for each `category`, showing the number of reservations booked on each day of the month.
- single-day displays a detailed view of the reservations on a given day
