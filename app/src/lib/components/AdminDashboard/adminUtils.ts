// AdminDashboard utility functions

export const formatDate = (dateString: string, options: 'short' | 'long' = 'short') => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: options === 'short' ? 'short' : 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', formatOptions);
  } catch (error) {
    console.error('Invalid date:', dateString);
    return 'Invalid Date';
  }
};

export const formatTime = (timeString: string) => {
  try {
    const time = new Date(`2000-01-01T${timeString}`);
    if (isNaN(time.getTime())) {
      return 'Invalid Time';
    }
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Invalid time:', timeString);
    return 'Invalid Time';
  }
};

export const getTypeDisplay = (type: string) => {
  const typeMap: Record<string, string> = {
    pool: 'Pool',
    open_water: 'Open Water',
    classroom: 'Classroom'
  };
  return typeMap[type] || type;
};
