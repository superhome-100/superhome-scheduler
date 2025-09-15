# Schema

## Structured schema tables

The following tables organize the schema into clear column definitions. Types are proposed based on the notes; adjustments can be made during implementation.

### user_profiles

| Column       | Type        | Description                                  |
|--------------|-------------|----------------------------------------------|
| uid         | uuid        | PK, equivalent to Auth login user ID         |
| name         | text        | Full name of the user                         |
| status       | text        | User status: 'active' or 'disabled'          |
| privileges   | text[]      | Array of privileges/roles associated with user (e.g., admin, user) |

### reservations

| Column      | Type        | Description                                               |
|-------------|-------------|-----------------------------------------------------------|
| uid        | uuid        | FK: references `user_profiles.uid`                       |
| res_date    | timestamptz | The date and time of the reservation                      |
| res_type    | text        | Type of reservation: e.g., Pool, open water, classroom    |
| res_status  | text        | Reservation status: 'confirmed' or 'rejected'             |

## Notes

- `uid` in `user_profiles` should be linked to the Auth system's unique user ID for coherence.
- `privileges` allows flexible role-based access control by storing an array of roles or permissions.
- `res_date` uses timestamp with timezone for precise scheduling.
- Consider adding indexes on `uid` and `res_date` in `reservations` for efficient lookups.
- Constraints or triggers can be added to enforce valid `res_type` and `res_status` values.
