# Admin Dashboard UI Plan for Blocking Reservations

In admin dashboard UI that admin can block slots may not always be available due to various reasons (capacity, maintenance, events, etc.).

The suggestion is to have a separate "availabilities" table in the database—this table should list when things are not available. Already in the schema is the "availabilities" table. The columns have included date, type, category, available.

The default assumption: If a date/type/category is not present in this table, then it’s available (available by default unless specifically listed as unavailable).


When a user changes the date, type, or category in the reservation form, the system should always check the availability table in the database to see any specific availability configuration for that date/type/category.

## Overview
Create an admin interface to block reservation categories and types by date with specific rules per category:
- Categories: Pool, Openwater, Classroom
- Types vary by category as detailed below
- Blocking functionality includes setting date per category rules

---

## Reservation Categories and Types

| Category   | Types                                   |
|------------|-----------------------------------------|
| Pool       | Autonomous, Course/Coaching             |
| Open Water | Course/Coaching, Autonomous on Buoy, Autonomous on Platform, Autonomous on Platform + CBS |
| Classroom  | Course/Coaching                         |


## UI Components

### 1. Filter and Selection Panel
- **Category Selector:** Dropdown with Pool, Openwater, Classroom
- **Type Selector:** Dynamic dropdown that updates options based on selected category
- **Date Picker:** Select single
- **Add Block Button**

### 2. Blocks Overview Table/Grid
- Columns: Date, Category, Type, Status (Blocked/Available)
- Actions: Edit block, Delete block, Bulk block/unblock
- Color coding for blocked slots

### 3. Add/Edit Blocking Modal or Form
- Inputs: Category, Type, Date(s)
- Validation:
  - Blocks allowed for same category/type/date
- Submit & Cancel buttons

---

## Functionality and Behavior

- Default availability assumed unless specifically blocked
- Upon selection/change in date/category/type, the system queries blocks to confirm availability
- Admin can block entire days as allowed
- Bulk blocking for multiple dates/types/categories encouraged for efficiency
- Conflict detection to prevent overlapping blocks
- Visual indicators in overview to show blocked vs available slots

---

## Suggested Approach

- Use dynamic forms driven by category/type rules to prevent invalid input
- Frontend validation plus backend enforcement to maintain data integrity
- Provide user feedback and input guidance for smooth admin experience

---

## Summary Table

| UI Element           | Pool & Classroom Rules                          | Open Water Rules      |
|----------------------|-------------------------------------------------|-----------------------|
| Type Options         | Autonomous, Course/Coaching                     | Course/Coaching, Autonomous on Buoy, Autonomous on Platform (+CBS) |

---

This plan aims for clear, efficient blocking management, improving admin control and reservation accuracy.

CREATE, UPDATE, and DELETE operations must always be performed through Server-side or Edge Functions.  
READ operations may access the database directly for improved efficiency.