// Dashboard utility functions
import { transformReservationToUnified, transformReservationsToUnified, type UnifiedReservation } from '../../utils/reservationTransform';

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
  // Return the exact database enum values, default to pending
  return status || 'pending';
};


export const getTimeOfDay = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return 'AM';
  return 'PM';
};

export const transformReservationsForModal = (reservations: any[]) => {
  console.log('transformReservationsForModal: Processing reservations with unified transformation');
  return transformReservationsToUnified(reservations);
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
