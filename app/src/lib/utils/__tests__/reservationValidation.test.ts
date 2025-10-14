import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateCutoffTime, 
  isReservationWithinCutoff,
  validateCreateReservationWithCutoff 
} from '../reservationValidation';
import type { CreateReservationData } from '../../services/reservationService';

// Mock the availability service
vi.mock('../../services/availabilityService', () => ({
  availabilityService: {
    checkAvailability: vi.fn()
  }
}));

describe('Reservation Validation with Cutoff', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock current time to 2024-01-15 10:00:00
    mockDate = new Date('2024-01-15T10:00:00Z');
    vi.setSystemTime(mockDate);
  });

  describe('validateCutoffTime', () => {
    it('should return valid when before open water cutoff', () => {
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = validateCutoffTime(reservationDate, 'open_water');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when after open water cutoff', () => {
      // Set current time to 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T19:00:00Z'));
      
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = validateCutoffTime(reservationDate, 'open_water');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('res_date');
      expect(result.errors[0].message).toContain('6 PM for next day');
    });

    it('should return valid when before pool cutoff', () => {
      const reservationDate = '2024-01-15T15:00:00Z'; // 3 PM same day
      const result = validateCutoffTime(reservationDate, 'pool');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when after pool cutoff', () => {
      // Set current time to 3 PM (after 2:30 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T15:00:00Z'));
      
      const reservationDate = '2024-01-15T15:00:00Z'; // Same time
      const result = validateCutoffTime(reservationDate, 'pool');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('res_date');
      expect(result.errors[0].message).toContain('30 minutes in advance');
    });

    it('should return valid for empty inputs', () => {
      const result = validateCutoffTime('', '');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isReservationWithinCutoff', () => {
    it('should return true when within cutoff', () => {
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = isReservationWithinCutoff(reservationDate, 'open_water');
      expect(result).toBe(true);
    });

    it('should return false when past cutoff', () => {
      // Set current time to 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T19:00:00Z'));
      
      const reservationDate = '2024-01-16T14:00:00Z'; // Next day
      const result = isReservationWithinCutoff(reservationDate, 'open_water');
      expect(result).toBe(false);
    });
  });

  describe('validateCreateReservationWithCutoff', () => {
    it('should validate successfully when before cutoff and available', async () => {
      const { availabilityService } = await import('../../services/availabilityService');
      
      // Mock availability service to return available
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        isAvailable: true,
        hasOverride: false
      });

      const reservationData: CreateReservationData = {
        res_type: 'open_water',
        res_date: '2024-01-16T14:00:00Z',
        openwater: {
          time_period: 'AM',
          depth_m: 10
        }
      };

      const result = await validateCreateReservationWithCutoff(reservationData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when after cutoff', async () => {
      // Set current time to 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2024-01-15T19:00:00Z'));

      const { availabilityService } = await import('../../services/availabilityService');
      
      // Mock availability service to return available
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        isAvailable: true,
        hasOverride: false
      });

      const reservationData: CreateReservationData = {
        res_type: 'open_water',
        res_date: '2024-01-16T14:00:00Z',
        openwater: {
          time_period: 'AM',
          depth_m: 10
        }
      };

      const result = await validateCreateReservationWithCutoff(reservationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('res_date');
      expect(result.errors[0].message).toContain('6 PM for next day');
    });

    it('should fail when unavailable', async () => {
      const { availabilityService } = await import('../../services/availabilityService');
      
      // Mock availability service to return unavailable
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        isAvailable: false,
        hasOverride: true,
        reason: 'Maintenance day'
      });

      const reservationData: CreateReservationData = {
        res_type: 'pool',
        res_date: '2024-01-16T14:00:00Z',
        pool: {
          start_time: '10:00',
          end_time: '11:00'
        }
      };

      const result = await validateCreateReservationWithCutoff(reservationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('res_date');
      expect(result.errors[0].message).toContain('not available for reservations');
      expect(result.errors[0].message).toContain('Maintenance day');
    });

    it('should handle availability service errors gracefully', async () => {
      const { availabilityService } = await import('../../services/availabilityService');
      
      // Mock availability service to throw error
      vi.mocked(availabilityService.checkAvailability).mockRejectedValue(
        new Error('Service unavailable')
      );

      const reservationData: CreateReservationData = {
        res_type: 'classroom',
        res_date: '2024-01-16T14:00:00Z',
        classroom: {
          start_time: '10:00',
          end_time: '11:00',
          room: 'Room A'
        }
      };

      const result = await validateCreateReservationWithCutoff(reservationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('res_date');
      expect(result.errors[0].message).toContain('Unable to verify availability');
    });

    it('should validate basic requirements first', async () => {
      const { availabilityService } = await import('../../services/availabilityService');
      
      // Mock availability service
      vi.mocked(availabilityService.checkAvailability).mockResolvedValue({
        isAvailable: true,
        hasOverride: false
      });

      const reservationData: CreateReservationData = {
        res_type: 'open_water',
        res_date: '', // Invalid - empty date
        openwater: {
          time_period: 'AM',
          depth_m: 10
        }
      };

      const result = await validateCreateReservationWithCutoff(reservationData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have basic validation errors, not cutoff errors
      expect(result.errors.some(e => e.message.includes('required'))).toBe(true);
    });
  });
});
