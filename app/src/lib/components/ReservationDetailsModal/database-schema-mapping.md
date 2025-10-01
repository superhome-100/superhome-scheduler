# Database Schema Mapping for Reservation Modal

## Database Tables Structure

### 1. `reservations` (Main table)
- `uid` (uuid) - User ID
- `res_date` (timestamptz) - Reservation date/time
- `res_type` (enum) - 'pool', 'open_water', 'classroom'
- `res_status` (enum) - 'pending', 'confirmed', 'rejected'

### 2. `res_pool` (Pool reservations)
- `uid` (uuid) - User ID
- `res_date` (timestamptz) - Reservation date/time
- `res_status` (enum) - 'pending', 'confirmed', 'rejected'
- `start_time` (time) - Start time
- `end_time` (time) - End time
- `lane` (text) - Lane assignment
- `note` (text) - Additional notes

### 3. `res_classroom` (Classroom reservations)
- `uid` (uuid) - User ID
- `res_date` (timestamptz) - Reservation date/time
- `res_status` (enum) - 'pending', 'confirmed', 'rejected'
- `start_time` (time) - Start time
- `end_time` (time) - End time
- `room` (text) - Room assignment
- `note` (text) - Additional notes

### 4. `res_openwater` (Open water reservations)
- `uid` (uuid) - User ID
- `res_date` (timestamptz) - Reservation date/time
- `res_status` (enum) - 'pending', 'confirmed', 'rejected'
- `time_period` (text) - Time period
- `depth_m` (integer) - Depth in meters
- `buoy` (text) - Buoy assignment
- `auto_adjust_closest` (boolean) - **REMOVED** - Auto adjust closest functionality removed
- `pulley` (boolean) - Pulley required
- `deep_fim_training` (boolean) - Deep FIM Training equipment required
- `bottom_plate` (boolean) - Bottom plate required
- `large_buoy` (boolean) - Large buoy required
- `note` (text) - Additional notes

## Modal Display Mapping

### Pool Reservations (`res_pool`)
- Start Time: `start_time`
- End Time: `end_time`
- Lane: `lane`
- Note: `note`

### Classroom Reservations (`res_classroom`)
- Start Time: `start_time`
- End Time: `end_time`
- Room: `room`
- Note: `note`

### Open Water Reservations (`res_openwater`)
- Time Period: `time_period`
- Depth: `depth_m` (in meters)
- Buoy: `buoy`
- Auto Adjust Closest: **REMOVED** - Functionality removed
- Pulley: `pulley` (Yes/No)
- Deep FIM Training: `deep_fim_training` (Yes/No)
- Bottom Plate: `bottom_plate` (Yes/No)
- Large Buoy: `large_buoy` (Yes/No)
- Note: `note`

## Status Display
- **Confirmed**: Green theme with success messaging
- **Pending**: Yellow theme with review messaging
- **Rejected**: Red theme with rejection messaging

## Type Display
- **Pool**: Blue theme
- **Classroom**: Red theme
- **Open Water**: Green theme
