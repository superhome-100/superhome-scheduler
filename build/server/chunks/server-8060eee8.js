import { g as getXataClient } from './xata-old-ddfee38d.js';
import ObjectsToCsv from 'objects-to-csv';
import JSZip from 'jszip';

const xata = getXataClient();
async function getBackUpZip(branch) {
  let zip = new JSZip();
  let client = getXataClient(branch);
  for (let tbl in client.db) {
    if (Object.prototype.hasOwnProperty.call(client.db, tbl)) {
      const records = await client.db[tbl].getAll();
      const csv = new ObjectsToCsv(records);
      const csvStr = await csv.toString();
      zip.file(branch + "/" + tbl + ".csv", csvStr);
    }
  }
  return zip;
}
async function getBuoys() {
  const buoys = await xata.db.Buoys.getAll();
  return buoys;
}
async function getUserActiveNotifications(userId) {
  const receipts = await xata.db.NotificationReceipts.filter({ user: userId }).getAll();
  const notifications = await xata.db.Notifications.getAll();
  return notifications.filter((ntf) => {
    return receipts.filter((rpt) => {
      return rpt?.notification?.id === ntf.id && rpt?.user?.id === userId;
    }).length == 0;
  });
}
async function insertNotificationReceipt(notificationId, userId) {
  const record = await xata.db.NotificationReceipts.create({
    user: userId,
    notification: notificationId
  });
  return record;
}

export { getBuoys as a, getUserActiveNotifications as b, getBackUpZip as g, insertNotificationReceipt as i };
//# sourceMappingURL=server-8060eee8.js.map
