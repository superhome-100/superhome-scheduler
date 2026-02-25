# SuperHOME Scheduler

Built with [sveltekit](https://kit.svelte.dev/) and [tailwind](https://tailwindcss.com)

# Tasks

## install

```bash
npm install
```

## dev

Make a copy and fill it `cp .env.template .env`

```bash
supabase start
supabase db reset
npm run dev
```

## database

to sync database schema to your local code generated config

```sh
supabase login
supabase link --project-ref bvyrboeudhhaqtibvlnc
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

See [db definition](./supabase/migrations/20260101000013_create_Reservations.sql) for precise details.

### Settings

Global settings are defined in the `Settings` table. The table consists of four columns: `name`, `value`, `startDate`, `endDate`.

The `value` column is a [JSON](https://jsonlint.com) type, but the true data type and format depends on the `name`.

The `startDate` and `endDate` fields indicate the inclusive date range within which the given value applies.
Both `startDate` and `endDate` values of `NULL` indicate that the value applies whenever a specific date range that includes the current date is not defined.

See [db definition](./supabase/migrations/20260101000011_create_Settings.sql) for precise details.

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

- Missing existing OW Full status, need to be locked manually again.

### Changes

- ViewMode is stored locally only, not on the server anymore
- At least 1 row from Reservations from 2023 is ignored due to null buddies field
- supabase client does not support batch update on client, proper solution would be transaction
- Reservations with id:
  - "rec_ci00b6dgttaab0qrfbgg",
  - "rec_ci00btdgttaab0qrfgmg",
  - "rec_ci02dltgttaab0qrnp2g"
    were deleted deleted due to overlapping startTime and endTime.
  - "rec_d618j2cj2gacb777o2t0" time modified due to overlapping startTime and endTime, record preserved
  - "rec_d6cksme9isv672su1m5g" time modified due to overlapping startTime and endTime, record preserved with modified times
