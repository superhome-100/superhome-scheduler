# Reservation Request Modal - Open Water Types & Depth Thresholds

## Overview

When the user selects **Open Water** in the reservation request modal, they must choose a type of activity from the following options, each with specific depth thresholds and additional inputs as applicable.

---

## Types Selection

- **Course/Coaching**
- **Autonomous on Buoy (0-89m)**
- **Autonomous on Platform (0-99m)**
- **Autonomous on Platform+CBS (90-130m)**

---

## Behavior by Type

### Course/Coaching

- When selected, display an input box:
  - Label: **No. of Students**
  - Input type: Number
  - Max allowed: 3
  - Allowed depth threshold: **0 to 130 meters**

### Autonomous on Buoy (0-89m)

- Allowed depth threshold: **15 to 89 meters**
- System should enforce this depth range for reservation depth input

### Autonomous on Platform (0-99m)

- Allowed depth threshold: **15 to 99 meters**
- System should enforce this depth range for reservation depth input

### Autonomous on Platform+CBS (90-130m)

- Allowed depth threshold: **90 to 130 meters**
- System should enforce this depth range for reservation depth input

---

## UI Interaction Summary

| User Selection                       | Additional Input          | Depth Threshold (meters) |
|--------------------------------------|---------------------------|--------------------------|
| Course/Coaching                      | No. of Students (max 3)   | N/A                      |
| Autonomous on Buoy (0-89m)           | None                      | 15 – 89                  |
| Autonomous on Platform (0-99m)       | None                      | 15 – 99                  |
| Autonomous on Platform+CBS (90-130m) | None                      | 90 – 130                 |

---

## Notes

- Minimum depth thresholds start at 15m for autonomous types to maintain safety standards.
- For Course/Coaching type, no depth enforcement is required since it is a training category.
- Input validations should be implemented to restrict user inputs accordingly.
- UI components should dynamically update based on the selected type to provide an intuitive user experience.

---

## Example Usage Flow

1. User selects **Open Water** in reservation modal.
2. The **Types** dropdown appears with the 4 options.
3. User selects **Course/Coaching**:
   - Input box for **No. of Students** appears, limited to 3.
4. User selects **Autonomous on Buoy (15-89m)**:
   - Depth input minimum set to 15m, maximum to 89m.
5. User selects **Autonomous on Platform (15-99m)**:
   - Depth input minimum set to 15m, maximum to 99m.
6. User selects **Autonomous on Platform+CBS (90-130m)**:
   - Depth input minimum set to 90m, maximum to 130m.

---

This structuring provides clear rules and UI behavior for different freediving activity types under the Open Water reservation category.
