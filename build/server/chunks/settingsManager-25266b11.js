const getOn = (setting, date) => {
  let val = setting.default;
  if (date !== void 0) {
    for (let entry of setting.entries) {
      if (entry.startDate <= date && date <= entry.endDate) {
        val = entry.value;
        break;
      }
    }
  }
  return val;
};
const getSettingsManager = (settings) => {
  const settingsManager = {
    getBoats: (date) => {
      return getOn(settings.boats, date);
    },
    getCancelationCutOffTime: (date) => {
      return getOn(settings.cancelationCutOffTime, date);
    },
    getCbsAvailable: (date) => {
      return getOn(settings.cbsAvailable, date);
    },
    getClassroomBookable: (date) => {
      return getOn(settings.classroomBookable, date);
    },
    getClassroomLabel: (date) => {
      return getOn(settings.classroomLabel, date);
    },
    getClassrooms: (date) => {
      return getOn(settings.classrooms, date);
    },
    getMaxChargeableOWPerMonth: (date) => {
      return getOn(settings.maxChargeableOWPerMonth, date);
    },
    getMaxClassroomEndTime: (date) => {
      return getOn(settings.maxClassroomEndTime, date);
    },
    getMaxPoolEndTime: (date) => {
      return getOn(settings.maxPoolEndTime, date);
    },
    getMinClassroomStartTime: (date) => {
      return getOn(settings.minClassroomStartTime, date);
    },
    getMinPoolStartTime: (date) => {
      return getOn(settings.minPoolStartTime, date);
    },
    getOpenForBusiness: (date) => {
      return getOn(settings.openForBusiness, date);
    },
    getOpenwaterAmBookable: (date) => {
      return getOn(settings.openwaterAmBookable, date);
    },
    getOpenwaterAmEndTime: (date) => {
      return getOn(settings.openwaterAmEndTime, date);
    },
    getOpenwaterAmStartTime: (date) => {
      return getOn(settings.openwaterAmStartTime, date);
    },
    getOpenwaterPmBookable: (date) => {
      return getOn(settings.openwaterPmBookable, date);
    },
    getOpenwaterPmEndTime: (date) => {
      return getOn(settings.openwaterPmEndTime, date);
    },
    getOpenwaterPmStartTime: (date) => {
      return getOn(settings.openwaterPmStartTime, date);
    },
    getPoolBookable: (date) => {
      return getOn(settings.poolBookable, date);
    },
    getPoolLabel: (date) => {
      return getOn(settings.poolLabel, date);
    },
    getPoolLanes: (date) => {
      return getOn(settings.poolLanes, date);
    },
    getRefreshIntervalSeconds: (date) => {
      return getOn(settings.refreshIntervalSeconds, date);
    },
    getReservationCutOffTime: (date) => {
      return getOn(settings.reservationCutOffTime, date);
    },
    getReservationIncrement: (date) => {
      return getOn(settings.reservationIncrement, date);
    },
    getReservationLeadTimeDays: (date) => {
      return getOn(settings.reservationLeadTimeDays, date);
    }
  };
  return settingsManager;
};

export { getSettingsManager as g };
//# sourceMappingURL=settingsManager-25266b11.js.map
