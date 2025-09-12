import { g as getXataUserDocWithFirebaseToken } from './firestore-df2a73b8.js';
import { g as getXataClient } from './xata-old-ddfee38d.js';
import { j as json } from './index-29bd59f7.js';
import dayjs from 'dayjs';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import 'firebase-admin';
import './user-7520bd1c.js';

const xata = getXataClient();
async function GET({ request, url }) {
  try {
    const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
    if (!xataUser || xataUser.status !== "active")
      throw new Error("User not allowed to access this resource");
    const queryParams = url.searchParams;
    const startDate = queryParams.get("startDate");
    const endDate = queryParams.get("endDate");
    const dateArray = [];
    let currentDate = dayjs(startDate);
    while (currentDate.isBefore(dayjs(endDate).add(1, "day"))) {
      dateArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }
    const reservations = await xata.db.Reservations.filter({
      date: {
        $any: dateArray
      },
      status: {
        $any: ["confirmed", "pending"]
      }
    }).select(["date", "category", "owTime", "status", "resType", "numStudents"]).getAll();
    const summary = {};
    for (const date of dateArray) {
      summary[date] = {
        pool: 0,
        openwater: {
          AM: 0,
          PM: 0,
          total: 0
        },
        classroom: 0
      };
    }
    for (const reservation of reservations) {
      const date = reservation.date;
      const category = reservation.category;
      const owTime = reservation.owTime;
      if (!date)
        continue;
      const day = summary[date];
      if (!day)
        continue;
      const count = reservation.resType === "course" ? (reservation.numStudents || 0) + 1 : 1;
      if (category === "pool") {
        day.pool += count;
      } else if (category === "classroom") {
        day.classroom += count;
      } else if (category === "openwater") {
        if (owTime === "AM") {
          day.openwater.AM += count;
        } else if (owTime === "PM") {
          day.openwater.PM += count;
        }
        day.openwater.total += count;
      }
    }
    return json({ status: "success", summary });
  } catch (error) {
    return json({ status: "error", error });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-af196956.js.map
