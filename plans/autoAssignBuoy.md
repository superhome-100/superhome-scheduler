## Migration Schema

### Table: Buoy
Stores buoy configuration data, segmented by open water reservation depth bands.

| Column    | Type         | Constraints                | Description                      |
|-----------|--------------|----------------------------|----------------------------------|
| id        | INTEGER      | PRIMARY KEY, AUTO_INCREMENT| Unique buoy identifier           |
| buoy_name | VARCHAR(64)  | NOT NULL, UNIQUE           | Buoy name (e.g., 'Buoy A')       |
| max_depth | INTEGER      | NOT NULL                   | Maximum depth supported (meters) |

#### SQL Example:

CREATE TABLE buoy (
id SERIAL PRIMARY KEY,
buoy_name VARCHAR(64) NOT NULL UNIQUE,
max_depth INTEGER NOT NULL
);

-- Add validation function
CREATE OR REPLACE FUNCTION validate_depth_assignment(
  diver_depth INTEGER,
  buoy_max_depth INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN diver_depth <= buoy_max_depth;
END;
$$ LANGUAGE plpgsql;
---

### Table: Buoy_Group
Stores auto-paired diver groups assigned to buoys on a given date and time period from the `public.res_openwater` reservations, including assigned boats.

|| Column     | Type         | Constraints                     | Description                                    |
||------------|--------------|---------------------------------|------------------------------------------------|
|| id         | INTEGER      | PRIMARY KEY, AUTO_INCREMENT     | Unique buoy group identifier                   |
|| note       | TEXT         | NULLABLE                        | Optional notes or comments                     |
|| res_date   | DATE         | NOT NULL                        | Reservation date, foreign key to res_openwater |
|| time_period | VARCHAR(16)  | NOT NULL                       | Time period, foreign key to res_openwater      |
|| buoy_name  | VARCHAR(64)  | NOT NULL, FOREIGN KEY to buoy   | References Buobuoy_name                        |
|| boat       | VARCHAR(32)  | NULLABLE                        | Assigned boat (manual byadmin)                 |
|| diver_ids  | INTEGER[]    | NULLABLE                        | Array of diver user IDs                        |

#### SQL Example:


CREATE TABLE buoy_group (
id SERIAL PRIMARY KEY,
note TEXT,
res_date DATE NOT NULL,
time_period VARCHAR(16) NOT NULL,
buoy_name VARCHAR(64) NOT NULL REFERENCES buoy(buoy_name),
boat VARCHAR(32),
diver_ids INTEGER[], -- Array of user IDs
CONSTRAINT fk_reservation FOREIGN KEY (res_date, time_period)
REFERENCES public.res_openwater(res_date, time_period)
);

---

-- Add buoy selection function
CREATE OR REPLACE FUNCTION find_best_buoy_for_depth(target_depth INTEGER) 
RETURNS VARCHAR(64) AS $$
DECLARE
  best_buoy VARCHAR(64);
BEGIN
  SELECT buoy_name INTO best_buoy
  FROM buoy 
  WHERE max_depth >= target_depth
  ORDER BY max_depth ASC
  LIMIT 1;
  
  RETURN best_buoy;
END;
$$ LANGUAGE plpgsql;

-- Add comment to clarify capacity checking
CREATE OR REPLACE FUNCTION check_buoy_capacity(buoy_name VARCHAR(64), res_date DATE, time_period VARCHAR(16)) 
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Count number of groups assigned to this buoy (not individual divers)
  SELECT COUNT(*) INTO current_count
  FROM buoy_group
  WHERE buoy_name = $1 
    AND res_date = $2 
    AND time_period = $3;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to handle large groups
CREATE OR REPLACE FUNCTION handle_odd_divers(
  diver_count INTEGER,
  target_depth INTEGER
) RETURNS VARCHAR(64) AS $$
DECLARE
  assigned_buoy VARCHAR(64);
BEGIN
  -- For odd numbers, try to find a buoy that can accommodate
  IF diver_count = 1 THEN
    -- Single diver - find smallest suitable buoy
    SELECT buoy_name INTO assigned_buoy
    FROM buoy 
    WHERE max_depth >= target_depth
    ORDER BY max_depth ASC
    LIMIT 1;
  ELSIF diver_count > 3 THEN
    -- Too many divers - find largest available buoy
    SELECT buoy_name INTO assigned_buoy
    FROM buoy 
    WHERE max_depth >= target_depth
    ORDER BY max_depth DESC
    LIMIT 1;
  END IF;
  
  RETURN assigned_buoy;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to handle large groups
CREATE OR REPLACE FUNCTION handle_odd_divers(
  diver_count INTEGER,
  target_depth INTEGER
) RETURNS VARCHAR(64) AS $$
DECLARE
  assigned_buoy VARCHAR(64);
BEGIN
  -- For odd numbers, try to find a buoy that can accommodate
  IF diver_count = 1 THEN
    -- Single diver - find smallest suitable buoy
    SELECT buoy_name INTO assigned_buoy
    FROM buoy 
    WHERE max_depth >= target_depth
    ORDER BY max_depth ASC
    LIMIT 1;
  ELSIF diver_count > 3 THEN
    -- Too many divers - find largest available buoy
    SELECT buoy_name INTO assigned_buoy
    FROM buoy 
    WHERE max_depth >= target_depth
    ORDER BY max_depth DESC
    LIMIT 1;
  END IF;
  
  RETURN assigned_buoy;
END;
$$ LANGUAGE plpgsql;


## Buoy Depth Bands (15-meter Intervals)

| Buoy Name | max_depth | Depth Range (m) |
|-----------|-----------|-----------------|
| Buoy 1    | 15        | 1 - 15          |
| Buoy 2    | 30        | 16 - 30         |
| Buoy 3    | 45        | 31 - 45         |
| Buoy 4    | 60        | 46 - 60         |
| Buoy 5    | 75        | 61 - 75         |
| Buoy 6    | 90        | 76 - 90         |
| Buoy 7    | 105       | 91 - 105        |
| Buoy 8    | 120       | 106 - 120       |
| Buoy 9    | 135       | 121 - 135       |

---
## Workflow Algorithm of AutoAssign in Open Water
- Divers/User submit a reservation.
- Admin approves the reservation request.

## Auto-Pairing Algorithm Summary

- Filter reservations by date, time period, reservation type, and target depth.
- Pair divers into groups of 2-3 based on closest depth meters (preferably ≤15m difference).
- Create buoy groups matched date, time period, reservation type, and target depth.
- Create buoy groups capturing these pairs and their metadata in `buoy_group`.
- Assign buoy group to buoys based on depth falling into buoy depth ranges.
- Max 3 divers per buoy group.
- Boat assignment is manual by admin for each buoy group. 
- drag-and-drop: Manual reassignment for Buoy and Boat.
- 3 divers_id will store in the buoy_group `divers_id`
UI
In Admin Single Day View in Open water Calendar - Show what Buoys it was assigned but Admin can still configure and change Buoys manually. Boat is Manually Configure by admin. Reservation show the 3 names of the buoy_group.
              AM/PM Count
| Buoy Name | Boat      | Reservations    |
|-----------|-----------|-----------------|
| Buoy 1    |           |  3 Divers Name  |
| Buoy 2    |           |  3 Divers Name  |
| Buoy 3    |           |  3 Divers Name  |
| Buoy 4    |           |  3 Divers Name  |
| Buoy 5    |           |  3 Divers Name  |
| Buoy 6    |           |  3 Divers Name  |
| Buoy 7    |           |  3 Divers Name  |
| Buoy 8    |           |  3 Divers Name  |
| Buoy 9    |           |  3 Divers Name  |

---

## Summary

This configuration ensures safe and logical grouping by depth, granular buoy segmentation, role-based calendar views, and flexible but controlled boat allocation, providing an efficient freediving reservation and management system.
