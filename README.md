# SuperHOME Scheduler

Built with [sveltekit](https://kit.svelte.dev/) and [tailwind](https://tailwindcss.com)

# Tasks

## install

```bash
npm install
```

## dev

```bash
npm run dev
```

## database

to sync database schema to your local code generated config

```sh
supabase start
supabase db reset
```

```sh
supabase login
supabase link --project-ref yzbmkdautiurjjmeliak
supabase db push # --include-seed
```

## ssh

```sh
ssh root@157.245.148.156
```

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
On the client, settings are retrieved via the `src/lib/client/settings` module, while on the server, they are retrieved via `src/lib/server/settings`. The reason for separate storage code for client and server is that the client uses a svelte store to cache the variables, and the server cannot use svelte stores.

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

## Migration

### Remarks

### Changes

- ViewMode is stored locally only, not on the server anymore
- At least 1 row from Reservations from 2023 is ignored due to null buddies field
- supabase client does not support batch update on client, proper solution would be transaction
- Reservations with id:
  - "rec_ci00b6dgttaab0qrfbgg",
  - "rec_ci00btdgttaab0qrfgmg",
  - "rec_ci02dltgttaab0qrnp2g"
    were deleted deleted due to overlapping startTime and endTime.
