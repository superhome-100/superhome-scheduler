// Dashboard utility functions

export const getUpcomingReservations = (reservations: any[]) => {
  const now = new Date();
  return reservations.filter(r => {
    const resDate = new Date(r.res_date);
    return resDate > now && (r.res_status === 'pending' || r.res_status === 'confirmed');
  });
};

export const getCompletedReservations = (reservations: any[]) => {
  const now = new Date();
  return reservations.filter(r => {
    const resDate = new Date(r.res_date);
    return resDate <= now || r.res_status === 'rejected';
  });
};

export const getTypeDisplay = (type: string) => {
  const typeMap: Record<string, string> = {
    pool: 'Pool',
    open_water: 'Open Water',
    classroom: 'Classroom'
  };
  return typeMap[type] || type;
};

export const getStatusDisplay = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    rejected: 'Rejected'
  };
  return statusMap[status] || status;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

export const getTimeOfDay = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

export const transformReservationsForModal = (reservations: any[]) => {
  return reservations.map(reservation => {
    const resDate = new Date(reservation.res_date);
    
    // Calculate duration based on reservation type
    let duration = 60; // Default 1 hour
    if (reservation.res_type === 'open_water') {
      duration = 240; // 4 hours for open water
    } else if (reservation.res_type === 'classroom') {
      duration = 120; // 2 hours for classroom
    }
    
    const endTime = new Date(resDate.getTime() + duration * 60 * 1000);
    
    return {
      id: `${reservation.uid}-${reservation.res_date}`,
      type: getTypeDisplay(reservation.res_type),
      status: reservation.res_status === 'confirmed' ? 'approved' : reservation.res_status,
      date: reservation.res_date,
      startTime: resDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      endTime: endTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      timeOfDay: getTimeOfDay(resDate),
      notes: reservation.description || '',
      title: reservation.title || '',
      // raw identifiers for details modal to fetch additional info
      uid: reservation.uid,
      res_date: reservation.res_date,
      res_type: reservation.res_type
    };
  });
};

export const reservationToCalendarEvent = (reservation: any) => {
  const statusColors: Record<string, string> = {
    pending: '#fde68a', // lighter amber for better contrast
    confirmed: '#bbf7d0', // lighter green
    rejected: '#fecaca'   // lighter red
  };

  const typeMap: Record<string, string> = {
    pool: 'Pool',
    open_water: 'Open Water',
    classroom: 'Classroom'
  };

  const d = new Date(reservation.res_date);
  const hour = d.getHours();
  const suffix = hour >= 12 ? 'pm' : 'am';
  let h12 = hour % 12; if (h12 === 0) h12 = 12;
  const timeShort = `${h12}${suffix}`;
  const typeLabel = typeMap[reservation.res_type] || reservation.res_type;
  const statusLabel = getStatusDisplay(reservation.res_status);

  return {
    id: `${reservation.uid}-${reservation.res_date}`,
    title: `${timeShort} ${typeLabel} ${statusLabel}`,
    start: reservation.res_date,
    backgroundColor: statusColors[reservation.res_status] || '#e5e7eb',
    borderColor: statusColors[reservation.res_status] || '#e5e7eb',
    textColor: '#0f172a',
    extendedProps: {
      reservation: { ...reservation } // Create a copy to avoid reference issues
    }
  };
};
