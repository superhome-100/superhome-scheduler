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

Facebook Login requires `https`. Additional dependencies may need to be installed to enable this in your dev environment.

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

### Important variables and their value ranges:

- Reservation object:
  - `category`: one of `pool`, `openwater`, `classroom`
  - `status`: one of `pending`, `confirmed`, `canceled`, `rejected`
  - `resType`: one of `autonomous`, `course`, `cbs`
  - `date`: a string in the format `year`/`month`/`day`
  - `owTime`: for `openwater` reservations only; one of `AM`, `PM`
  - `startTime`/`endTime`: for `pool` and `classroom` reservations only; a string in the format `hour`:`minute`
  - `owner`: boolean indicating whether the current user was the last user to create/modify the reservation
  - `buddies`: a list of user Ids indicating which other users are buddies on this reservation

### Settings

Global settings are defined in the `Settings` table on xata. The table consists of four columns: `name`, `value`, `startDate`, `endDate`.<br><br>
The `value` column is a string type, but the true data type for each setting may be different. Each setting variable is converted to its true data type in the function `parseSettingsTbl` in `src/lib/utils.js`<br><br>
The `startDate` and `endDate` fields indicate the date range within which the given value applies. `startDate` and `endDate` values of `default` indicate that the value applies whenever a specific date range that includes the current date is not defined.<br><br>
On the client, settings are retrieved via the `src/lib/settings.js` module, while on the server, they are retrieved via `src/lib/server/settings.js`. The reason for separate storage code for client and server is that the client uses a svelte store to cache the variables, and the server cannot use svelte stores.

### Client-side code

Client-side code consists of three pages: `root`, `multi-day`, and `single-day`.

- `root` displays the user's own reservations
  - relevant components:
    - `MyReservations.svelte`
- `multi-day` displays a monthly calendar view, with a separate display for each `category`, showing the total number of users with either pending or confirmed reservations on each day of the month
- `single-day` displays a detailed view of the reservations on a given day
  - relevant components:
    - `DayOpenWater.svelte`
    - `DayHourly.svelete`
