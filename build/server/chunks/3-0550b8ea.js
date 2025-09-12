import { s as submitReservation, V as ValidationError, m as modifyReservation, c as cancelReservation, a as adminUpdate } from './reservation-24e75460.js';
import { i as insertNotificationReceipt } from './server-8060eee8.js';
import { f as fail } from './index-29bd59f7.js';
import { u as updateNickname } from './user-7520bd1c.js';
import { u as upsertOWReservationAdminComments } from './ow-98e630d9.js';
import { d as doTransaction } from './firestore-df2a73b8.js';
import './settings-a7eb4ae9.js';
import './stores2-2fbb3163.js';
import './index2-be97e17a.js';
import './index3-9a6d7026.js';
import './firebase-abda0d73.js';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'axios';
import './datetimeUtils-b60811f0.js';
import 'dayjs';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import './settingsManager-25266b11.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import './reservations-a581989b.js';
import './settings2-3108d47d.js';
import './assignRsvsToBuoys-33e33a44.js';
import 'lodash';
import 'objects-to-csv';
import 'jszip';
import 'firebase-admin';

const adminUpdateGeneric = async ({ request }) => {
  const data = await request.formData();
  console.log("adminUpdateGeneric", data);
  const category = data.get("category");
  let record;
  await doTransaction(category, data.get("date"), async () => {
    record = await adminUpdate(data);
  });
  return { record };
};
const actions = {
  submitReservation: async ({ request }) => {
    try {
      const data = await request.formData();
      const category = data.get("category");
      let record;
      await doTransaction(category, data.get("date"), async () => {
        record = await submitReservation(data);
      });
      return record;
    } catch (e) {
      console.error("error submitReservation", e);
      if (e instanceof ValidationError) {
        return fail(400, { error: e.message });
      } else {
        throw e;
      }
    }
  },
  modifyReservation: async ({ request }) => {
    const data = await request.formData();
    try {
      const category = data.get("category");
      let record;
      await doTransaction(category, data.get("date"), async () => {
        record = await modifyReservation(data);
      });
      return record;
    } catch (e) {
      console.error("error modifyReservation", e);
      if (e instanceof ValidationError) {
        return fail(400, { error: e.message });
      } else {
        throw e;
      }
    }
  },
  cancelReservation: async ({ request }) => {
    try {
      const data = await request.formData();
      console.log("cancelReservation", data);
      const category = data.get("category");
      let record;
      await doTransaction(category, data.get("date"), async () => {
        record = await cancelReservation(data);
      });
      return record;
    } catch (e) {
      console.error("error cancelReservation", e);
      if (e instanceof ValidationError) {
        return fail(400, { error: e.message });
      } else {
        throw e;
      }
    }
  },
  adminUpdateConfirmed: adminUpdateGeneric,
  adminUpdatePending: adminUpdateGeneric,
  adminUpdateRejected: adminUpdateGeneric,
  nickname: async ({ request }) => {
    const data = await request.formData();
    const record = await updateNickname(data.get("id"), data.get("nickname"));
    return record;
  },
  submitReceipt: async ({ request }) => {
    const data = await request.formData();
    const { notificationId, userId, accept } = Object.fromEntries(data);
    if (accept === "on") {
      await insertNotificationReceipt(notificationId, userId);
    }
  },
  adminCommentUpdate: async ({ request }) => {
    const data = await request.formData();
    const adminComment = data.get("admin_comments");
    const record = await upsertOWReservationAdminComments({
      comment: adminComment,
      date: data.get("date"),
      buoy: data.get("buoy"),
      am_pm: data.get("owTime")
    });
    return { record };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-aad76674.js')).default;
const server_id = "src/routes/+page.server.ts";
const imports = ["_app/immutable/nodes/3.c6caa20e.js","_app/immutable/chunks/index.8e4fed50.js","_app/immutable/chunks/forms.ca44f84b.js","_app/immutable/chunks/singletons.daa49798.js","_app/immutable/chunks/parse.bee59afc.js","_app/immutable/chunks/firebase.81e41ff6.js","_app/immutable/chunks/index.esm.a8d17a83.js","_app/immutable/chunks/stores.cbfdd944.js","_app/immutable/chunks/Popup.e2ab39b7.js","_app/immutable/chunks/RsvTabs.453366a9.js"];
const stylesheets = ["_app/immutable/assets/forms.7df9bea5.css","_app/immutable/assets/index.a4b8bbdd.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-0550b8ea.js.map
