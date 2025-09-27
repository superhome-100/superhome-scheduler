// Shared reservation data for Dashboard and Reservation views
export interface Reservation {
  id: number;
  date: string;
  type: 'Pool' | 'Open Water' | 'Classroom';
  status: 'approved' | 'pending' | 'rejected' | 'completed' | 'ongoing';
  startTime: string;
  endTime: string;
  timeOfDay?: 'AM' | 'PM';
  notes?: string;
}

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Upcoming reservations data - cleared of sample data
export const upcomingReservations: Reservation[] = [];

// Completed reservations data - cleared of sample data
export const completedReservations: Reservation[] = [];

// Get all reservations (upcoming + completed)
export const getAllReservations = (): Reservation[] => {
  return [...upcomingReservations, ...completedReservations];
};

// Get completed reservations including today's completed ones
export const getCompletedReservations = (): Reservation[] => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  // Get today's reservations that are completed (past their end time)
  const todaysCompleted = upcomingReservations.filter(reservation => {
    if (reservation.date !== todayString) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const endTime = parseInt(reservation.endTime.replace(':', ''));
    
    return currentTime >= endTime;
  }).map(reservation => ({
    ...reservation,
    status: 'completed' as const
  }));
  
  return [...completedReservations, ...todaysCompleted];
};

// Check if a reservation is ongoing (today and not yet completed)
export const isOngoingReservation = (reservation: Reservation): boolean => {
  const today = new Date();
  const reservationDate = new Date(reservation.date);
  
  // Check if it's today
  const isToday = today.toDateString() === reservationDate.toDateString();
  
  if (!isToday) return false;
  
  // Check if the current time is before the end time
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const endTime = parseInt(reservation.endTime.replace(':', ''));
  
  return currentTime < endTime;
};

// Get ongoing reservations for today
export const getOngoingReservations = (): Reservation[] => {
  return upcomingReservations.filter(isOngoingReservation);
};

// Get upcoming reservations (future dates + ongoing today)
export const getUpcomingReservations = (): Reservation[] => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return upcomingReservations.filter(reservation => {
    // Include future dates
    if (reservation.date > todayString) return true;
    
    // Include ongoing reservations for today
    if (reservation.date === todayString && isOngoingReservation(reservation)) return true;
    
    return false;
  });
};

// Get reservations with dynamic status (ongoing for today's reservations)
export const getReservationsWithDynamicStatus = (): Reservation[] => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return upcomingReservations.map(reservation => {
    // If it's today and ongoing, set status to 'ongoing'
    if (reservation.date === todayString && isOngoingReservation(reservation)) {
      return {
        ...reservation,
        status: 'ongoing' as const
      };
    }
    
    return reservation;
  });
};

// Filter reservations by type (upcoming + ongoing)
export const getReservationsByType = (type: 'pool' | 'openwater' | 'classroom'): Reservation[] => {
  const typeMapping = {
    'pool': 'Pool',
    'openwater': 'Open Water',
    'classroom': 'Classroom'
  };
  
  return getUpcomingReservations().filter(reservation => 
    reservation.type === typeMapping[type]
  );
};

// Convert reservation to calendar event
export const reservationToCalendarEvent = (reservation: Reservation) => {
  const typeColors = {
    'Pool': { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    'Open Water': { backgroundColor: '#10b981', borderColor: '#10b981' },
    'Classroom': { backgroundColor: '#ef4444', borderColor: '#ef4444' }
  };

  const colors = typeColors[reservation.type];
  
  return {
    id: reservation.id.toString(),
    title: `${reservation.type} - ${reservation.startTime}`,
    start: reservation.date,
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    extendedProps: {
      reservation: reservation
    }
  };
};
