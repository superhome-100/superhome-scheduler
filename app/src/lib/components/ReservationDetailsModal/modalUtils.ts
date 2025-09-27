export const formatDate = (dateString: string) => {
  try {
    if (!dateString) return 'No Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Invalid date:', dateString);
    return 'Invalid Date';
  }
};

export const formatTime = (timeString: string) => {
  try {
    if (!timeString) return 'No Time';
    const time = new Date(`2000-01-01T${timeString}`);
    if (isNaN(time.getTime())) {
      return 'Invalid Time';
    }
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Invalid time:', timeString);
    return 'Invalid Time';
  }
};
