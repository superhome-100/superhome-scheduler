Default Price template id
In-house
In-houseCoach
Instructor
regular
Vip1
Vip2

Retrieve the latest price associated with the user (identified by uid) for the given reservation type.

If no user-specific price exists, fallback to the latest default price for that reservation type.

Ensure the price's created_at timestamp is less than or equal to the reservation's created_at timestamp to only consider prices valid at or before the reservation time.

Schema
| id           | coachow | coachpool | coachclassroom | autoow | autopool | cbsow | prosafetyow | platformow | platformcbsow | compsetupow |
|--------------|---------|-----------|----------------|--------|----------|-------|-------------|------------|---------------|-------------|
| In-house     | 1000    | 400       | 300            | 765    | 0        | 2000  | 2000        | 1300       | 1500          | 2000        |
| In-houseCoach| 1000    | 0         | 300            | 765    | 0        | 2000  | 2000        | 1300       | 1500          | 2000        |
| Instructor   | 800     | 300       | 200            | 100    | 0        | 100   | 100         | 100        | 100           | 100         |
| regular      | 1000    | 400       | 300            | 900    | 300      | 2000  | 2000        | 1300       | 1500          | 2000        |
| Vip1         | 1000    | 400       | 300            | 900    | 0        | 2000  | 2000        | 1300       | 1500          | 2000        |
| Vip2         | 1000    | 400       | 300            | 100    | 0        | 100   | 100         | 100        | 100           | 100         |