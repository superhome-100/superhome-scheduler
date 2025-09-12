import { g as getXataClient } from './xata-old-ddfee38d.js';
import { g as getSettingsManager } from './settingsManager-25266b11.js';

const xata = getXataClient();
let settings;
const initSettings = async () => {
  if (!settings) {
    settings = await getSettings();
  }
  return getSettingsManager(settings);
};
const getSettings = async () => {
  const settingsTbl = await xata.db.Settings.getAll();
  return parseSettingsTbl(settingsTbl);
};
function parseSettingsTbl(settingsTbl) {
  let settings2 = {};
  let fields = new Set(settingsTbl.map((e) => e.name));
  let fixTypes = (e) => {
    let name = e.name;
    let v = e.value;
    if (["maxChargeableOWPerMonth", "refreshIntervalSeconds", "reservationLeadTimeDays"].includes(
      name
    )) {
      v = parseInt(v);
    }
    if (name === "refreshIntervalSeconds") {
      name = "refreshInterval";
      v = v * 1e3;
    }
    if ([
      "cbsAvailable",
      "classroomBookable",
      "openForBusiness",
      "openwaterAmBookable",
      "openwaterPmBookable",
      "poolBookable"
    ].includes(name)) {
      v = v === "true";
    }
    if (["poolLanes", "classrooms", "boats", "captains"].includes(name)) {
      v = v.split(";");
    }
    return {
      ...e,
      name,
      value: v
    };
  };
  fields.forEach((field) => {
    let entries = settingsTbl.filter((e) => e.name === field).map((e) => fixTypes(e));
    let def = entries.splice(
      entries.findIndex((e) => e.startDate === "default"),
      1
    )[0];
    if (def.name) {
      settings2[def.name] = {
        default: def.value,
        entries
      };
    }
  });
  return settings2;
}

export { getSettings as g, initSettings as i };
//# sourceMappingURL=settings2-3108d47d.js.map
