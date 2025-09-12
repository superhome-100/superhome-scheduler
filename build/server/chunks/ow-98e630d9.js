import { g as getXataClient } from './xata-old-ddfee38d.js';

const upsertOWReservationAdminComments = async (data) => {
  const client = getXataClient();
  const { buoy, date, am_pm, comment } = data;
  const recordId = `${buoy}-${date}-${am_pm}`;
  let record;
  if (comment) {
    try {
      record = await client.db.BuoyGroupings.createOrUpdate(recordId, {
        buoy,
        date: new Date(date),
        am_pm,
        comment
      });
    } catch (error) {
      console.error("upsertOWReservationAdminComments", error);
    }
  } else {
    const rec = await client.db.BuoyGroupings.delete(recordId);
    record = { ...rec, comment: null };
  }
  return record;
};
const getOWReservationAdminComments = async (date) => {
  const client = getXataClient();
  const data = await client.db.BuoyGroupings.filter({
    date: new Date(date)
  }).getMany();
  return data;
};

export { getOWReservationAdminComments as g, upsertOWReservationAdminComments as u };
//# sourceMappingURL=ow-98e630d9.js.map
