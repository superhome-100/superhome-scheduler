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

### res_pool
| Column      | Type        | Description                                               |
|-------------|-------------|-----------------------------------------------------------|
| uid        | uuid        | FK: references `user_profiles.uid`                         |
| res_date    | date        | The date and time of the reservation                      |
| start_time    | time      | The start time of the reservation                         |
| end_time    | time        | The end time of the reservation                           |
| res_type    | text        | Type of reservation: Pool,                                |
| res_status  | text        | Reservation status: 'confirmed' 'pending' 'rejected'      |
| comment     | text        | Notes                                                     |

### res_openwater
| Column      | Type        | Description                                               |
|-------------|-------------|-----------------------------------------------------------|
| uid        | uuid        | FK: references `user_profiles.uid`                         |
| res_date    | timestamptz | The date and time of the reservation                      |
| timeperiod  | text        | The time period of the reservation                        |
| depth_m     | integer     | The depth of the reservation                              |
| res_type    | text        | Type of reservation: e.g., Pool, open water, classroom    |
| res_status  | text        | Reservation status: 'confirmed' 'pending' 'rejected'      |
| comment     | text        | Notes                                                     |

### res_classroom
| Column      | Type        | Description                                               |
|-------------|-------------|-----------------------------------------------------------|
| uid         | uuid        | FK: references `user_profiles.uid`                        |
| res_date    | date | The date and time of the reservation                      |
| start_time  | time        | The start time of the reservation                         |
| end_time    | time        | The end time of the reservation                           |
| res_type    | text        | Type of reservation: e.g., Pool, open water, classroom    |
| res_status  | text        | Reservation status: 'confirmed' 'pending' 'rejected'      |
| comment     | text        | Notes                                                     |

## Notes

- `uid` in `user_profiles` should be linked to the Auth system's unique user ID for coherence.
- `privileges` allows flexible role-based access control by storing an array of roles or permissions.
- `res_date` uses date with timezone for precise scheduling.
- Consider adding indexes on `uid` and `res_date` in `reservations` for efficient lookups.
- Constraints or triggers can be added to enforce valid `res_type` and `res_status` values.
-Each reservation table (res_pool, res_openwater, res_classroom) includes a res_status column to track the current state of the reservation, facilitating workflow management such as approval processes.

-The comment field in reservation tables allows users or administrators to record supplementary information or special instructions related to specific bookings.

-The separation of reservation types into distinct tables (res_pool, res_openwater, res_classroom) accommodates specialized attributes relevant to each type, such as depth_m for open water reservations or start_time and end_time for timed bookings, enabling precise data representation and easier maintenance.

-Foreign key references to user_profiles.uid ensure data integrity by linking reservations explicitly to registered users.

-Time-related columns use appropriate types (timestamptz, date, time) to reflect different scheduling needs, enabling accurate date and time handling across various reservation contexts.

-Implementing foreign key constraints and consistent data typing helps maintain relational database normalization and prevents orphaned reservation records.

-When designing the system, consider data validation on res_type and res_status to accept only predefined, controlled vocabulary to avoid inconsistencies.

-Enable RLS (strict) for reservations table to enforce data integrity and prevent unauthorized access.

-USER PROFILES POLICIES: user can only manage their own row
-No delete policy (strict): users cannot delete their profile rows by default
-RESERVATIONS POLICIES: user can manage their own reservations, admins can manage all
-ADMIN HELPER FUNCTION: Check if current user is admin
-Grant execute permission to authenticated users
-ADMIN POLICIES FOR USER_PROFILES: Allow admins to view and update all users
-ADMIN POLICIES FOR RESERVATIONS: Allow admins to view and manage all reservations