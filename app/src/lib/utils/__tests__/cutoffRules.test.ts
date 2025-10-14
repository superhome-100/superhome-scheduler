import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getCutoffTime, 
  isBeforeCutoff, 
  formatCutoffTime, 
  getCutoffDescription,
  getTimeUntilCutoff 
} from '../cutoffRules';
import type { ReservationType } from '../../services/reservationService';

describe('Cutoff Rules', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock current time to 2024-01-15 10:00:00
    mockDate = new Date('2024-01-15T10:00:00Z');
    vi.setSystemTime(mockDate);
  });

  describe('getCutoffTime', () => {
    it('should return 6 PM the day before for open water reservations', () => {
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day at 2 PM
      const cutoffTime = getCutoffTime('open_water', reservationDate);
      
      // Should be 6 PM on 2024-01-15 (the day before)
      const expected = new Date('2024-01-15T18:00:00Z');
      expect(cutoffTime).toEqual(expected);
    });

    it('should return 30 minutes before reservation time for pool reservations', () => {
      const reservationDate = '2024-01-15T15:00:00Z'; // Same day at 3 PM
      const cutoffTime = getCutoffTime('pool', reservationDate);
      
      // Should be 30 minutes before 3 PM = 2:30 PM
      const expected = new Date('2024-01-15T14:30:00Z');
      expect(cutoffTime).toEqual(expected);
    });

    it('should return 30 minutes before reservation time for classroom reservations', () => {
      const reservationDate = '2024-01-15T16:00:00Z'; // Same day at 4 PM
      const cutoffTime = getCutoffTime('classroom', reservationDate);
      
      // Should be 30 minutes before 4 PM = 3:30 PM
      const expected = new Date('2024-01-15T15:30:00Z');
      expect(cutoffTime).toEqual(expected);
    });
  });

  describe('isBeforeCutoff', () => {
    it('should return true when current time is before open water cutoff', () => {
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = isBeforeCutoff(reservationDate, 'open_water');
      
      // Current time (10 AM) is before 6 PM cutoff
      expect(result).toBe(true);
    });

    it('should return false when current time is after open water cutoff', () => {
      // Set current time to 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T19:00:00Z'));
      
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = isBeforeCutoff(reservationDate, 'open_water');
      
      expect(result).toBe(false);
    });

    it('should return true when current time is before pool cutoff', () => {
      const reservationDate = '2024-01-15T15:00:00Z'; // 3 PM same day
      const result = isBeforeCutoff(reservationDate, 'pool');
      
      // Current time (10 AM) is before 2:30 PM cutoff
      expect(result).toBe(true);
    });

    it('should return false when current time is after pool cutoff', () => {
      // Set current time to 3 PM (after 2:30 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T15:00:00Z'));
      
      const reservationDate = '2024-01-15T15:00:00Z'; // Same time
      const result = isBeforeCutoff(reservationDate, 'pool');
      
      expect(result).toBe(false);
    });

    it('should return false for same day open water reservations', () => {
      const reservationDate = '2024-01-15T14:00:00Z'; // Same day at 2 PM
      const result = isBeforeCutoff(reservationDate, 'open_water');
      
      // Same day open water reservations are not allowed
      expect(result).toBe(false);
    });
  });

  describe('formatCutoffTime', () => {
    it('should format cutoff time correctly', () => {
      const cutoffTime = new Date('2024-01-15T18:00:00Z');
      const formatted = formatCutoffTime(cutoffTime);
      
      // Should contain day, date, and time
      expect(formatted).toContain('Mon');
      expect(formatted).toContain('Jan 15');
      expect(formatted).toContain('6:00 PM');
    });
  });

  describe('getCutoffDescription', () => {
    it('should return correct description for open water', () => {
      const description = getCutoffDescription('open_water');
      expect(description).toBe('Open water reservations must be made before 6 PM for next day');
    });

    it('should return correct description for pool', () => {
      const description = getCutoffDescription('pool');
      expect(description).toBe('Pool reservations must be made at least 30 minutes in advance');
    });

    it('should return correct description for classroom', () => {
      const description = getCutoffDescription('classroom');
      expect(description).toBe('Classroom reservations must be made at least 30 minutes in advance');
    });
  });

  describe('getTimeUntilCutoff', () => {
    it('should calculate time remaining correctly for open water', () => {
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const timeRemaining = getTimeUntilCutoff(reservationDate, 'open_water');
      
      // 6 PM - 10 AM = 8 hours
      expect(timeRemaining.hours).toBe(8);
      expect(timeRemaining.minutes).toBe(0);
      expect(timeRemaining.totalMinutes).toBe(480);
    });

    it('should calculate time remaining correctly for pool', () => {
      const reservationDate = '2024-01-15T15:00:00Z'; // 3 PM same day
      const timeRemaining = getTimeUntilCutoff(reservationDate, 'pool');
      
      // 2:30 PM - 10 AM = 4.5 hours
      expect(timeRemaining.hours).toBe(4);
      expect(timeRemaining.minutes).toBe(30);
      expect(timeRemaining.totalMinutes).toBe(270);
    });

    it('should return zero when cutoff has passed', () => {
      // Set current time to 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T19:00:00Z'));
      
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const timeRemaining = getTimeUntilCutoff(reservationDate, 'open_water');
      
      expect(timeRemaining.hours).toBe(0);
      expect(timeRemaining.minutes).toBe(0);
      expect(timeRemaining.totalMinutes).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same day open water reservations correctly', () => {
      const reservationDate = '2024-01-15T14:00:00Z'; // Same day at 2 PM
      const cutoffTime = getCutoffTime('open_water', reservationDate);
      
      // Should be 6 PM on 2024-01-14 (day before)
      const expected = new Date('2024-01-14T18:00:00Z');
      expect(cutoffTime).toEqual(expected);
    });

    it('should handle timezone differences correctly', () => {
      // Test with different timezone
      const reservationDate = '2024-01-16T00:00:00+09:00'; // Next day in JST
      const cutoffTime = getCutoffTime('open_water', reservationDate);
      
      // Should still be 6 PM UTC on 2024-01-15
      const expected = new Date('2024-01-15T18:00:00Z');
      expect(cutoffTime).toEqual(expected);
    });

    it('should handle leap year correctly', () => {
      // Set to leap year
      vi.setSystemTime(new Date('2024-02-28T10:00:00Z'));
      
      const reservationDate = '2024-02-29T14:00:00Z'; // Leap day
      const cutoffTime = getCutoffTime('open_water', reservationDate);
      
      // Should be 6 PM on 2024-02-28
      const expected = new Date('2024-02-28T18:00:00Z');
      expect(cutoffTime).toEqual(expected);
    });
  });
});
