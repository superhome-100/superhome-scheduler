import { s as settings } from './stores2-2fbb3163.js';
import { g as get_store_value } from './index3-9a6d7026.js';
import { g as getSettingsManager } from './settingsManager-25266b11.js';

var OWTime = /* @__PURE__ */ ((OWTime2) => {
  OWTime2["AM"] = "AM";
  OWTime2["PM"] = "PM";
  return OWTime2;
})(OWTime || {});
var ReservationType = /* @__PURE__ */ ((ReservationType2) => {
  ReservationType2["autonomous"] = "autonomous";
  ReservationType2["course"] = "course";
  ReservationType2["cbs"] = "cbs";
  ReservationType2["proSafety"] = "proSafety";
  ReservationType2["autonomousPlatform"] = "autonomousPlatform";
  ReservationType2["autonomousPlatformCBS"] = "autonomousPlatformCBS";
  ReservationType2["competitionSetupCBS"] = "competitionSetupCBS";
  return ReservationType2;
})(ReservationType || {});
var ReservationCategory = /* @__PURE__ */ ((ReservationCategory2) => {
  ReservationCategory2["openwater"] = "openwater";
  ReservationCategory2["pool"] = "pool";
  ReservationCategory2["classroom"] = "classroom";
  return ReservationCategory2;
})(ReservationCategory || {});
var ReservationStatus = /* @__PURE__ */ ((ReservationStatus2) => {
  ReservationStatus2["confirmed"] = "confirmed";
  ReservationStatus2["pending"] = "pending";
  ReservationStatus2["rejected"] = "rejected";
  ReservationStatus2["canceled"] = "canceled";
  return ReservationStatus2;
})(ReservationStatus || {});
let Settings = getSettingsManager(get_store_value(settings));
settings.subscribe((newSettings) => {
  Settings = getSettingsManager(newSettings);
});

export { OWTime as O, ReservationType as R, Settings as S, ReservationCategory as a, ReservationStatus as b };
//# sourceMappingURL=settings-a7eb4ae9.js.map
