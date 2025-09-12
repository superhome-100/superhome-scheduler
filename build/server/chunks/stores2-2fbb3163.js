import { w as writable } from './index2-be97e17a.js';
import { a as auth } from './firebase-abda0d73.js';
import axios from 'axios';
import { g as getYYYYMMDD } from './datetimeUtils-b60811f0.js';

const getBuoys = async () => {
  const response = await fetch("/api/getBuoys");
  const data = await response.json();
  return data;
};
const getBoatAssignmentsByDate = async (date) => {
  const response = await fetch(`/api/ow/${date}/boat-assignments`);
  const data = await response.json();
  return data;
};
const getOWAdminComments = async (date) => {
  const response = await fetch(`/api/ow/${date}/admin-comments`);
  let adminComments2 = [];
  try {
    const res = await response.json();
    if (res.message) {
      throw new Error(res.message);
    } else {
      adminComments2 = res;
    }
  } catch (error) {
    console.error("getOWAdminComments: error getting admin ow comments", error);
  }
  return adminComments2;
};
const getReservationsByDate = async (date, category) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/getReservationsByDate", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ date, category })
  });
  let data = await response.json();
  return data;
};
const getReservationSummary = async (startDate, endDate) => {
  const token = await auth.currentUser?.getIdToken();
  try {
    if (token) {
      const response = await axios.get(`/api/reports/reservations`, {
        params: {
          startDate: getYYYYMMDD(startDate),
          endDate: getYYYYMMDD(endDate)
        },
        headers: {
          "Content-type": "application/json",
          Authorization: "Bearer " + token
        }
      });
      let data = response.data;
      return data;
    }
  } catch (error) {
    console.error("getReservationSummary: error getting reservation summary", error);
  }
};
const buoys = writable([]);
const canSubmit = writable(false);
const loginState = writable("pending");
const notifications = writable([]);
const profileSrc = writable(null);
const reservations = writable([]);
const settings = writable();
const user = writable(null);
const users = writable([]);
const view = writable("multi-day");
const viewMode = writable("normal");
const stateLoaded = writable(false);
const adminComments = writable({});
const incomingReservations = writable([]);
const owUpdateStates = writable({});
const syncBuoys = async () => {
  const res = await getBuoys();
  buoys.set(res.buoys);
};

export { stateLoaded as a, users as b, view as c, canSubmit as d, buoys as e, getReservationsByDate as f, getReservationSummary as g, adminComments as h, incomingReservations as i, getOWAdminComments as j, syncBuoys as k, loginState as l, getBoatAssignmentsByDate as m, notifications as n, owUpdateStates as o, profileSrc as p, reservations as r, settings as s, user as u, viewMode as v };
//# sourceMappingURL=stores2-2fbb3163.js.map
