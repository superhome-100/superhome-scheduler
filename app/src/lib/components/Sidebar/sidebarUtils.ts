export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatUserName = (name: string): string => {
  return name.trim() || 'User';
};

export const formatUserEmail = (email: string): string => {
  return email.trim() || 'user@example.com';
};
