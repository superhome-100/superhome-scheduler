import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AvailabilityService } from '../availabilityService';
import type { ReservationType } from '../reservationService';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
};

vi.mock('../../utils/supabase', () => ({
  supabase: mockSupabase
}));

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(() => {
    service = new AvailabilityService();
    vi.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return available when no override exists', async () => {
      // Mock no rows found (PGRST116 error)
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockQuery)
          })
        })
      });

      const result = await service.checkAvailability('2024-01-15', 'pool');
      
      expect(result.isAvailable).toBe(true);
      expect(result.hasOverride).toBe(false);
    });

    it('should return unavailable when override exists', async () => {
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: {
            available: false,
            reason: 'Maintenance day'
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockQuery)
          })
        })
      });

      const result = await service.checkAvailability('2024-01-15', 'pool');
      
      expect(result.isAvailable).toBe(false);
      expect(result.hasOverride).toBe(true);
      expect(result.reason).toBe('Maintenance day');
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockQuery)
          })
        })
      });

      const result = await service.checkAvailability('2024-01-15', 'pool');
      
      expect(result.isAvailable).toBe(false);
      expect(result.hasOverride).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await service.checkAvailability('2024-01-15', 'pool');
      
      expect(result.isAvailable).toBe(false);
      expect(result.hasOverride).toBe(false);
    });
  });

  describe('checkMultipleAvailabilities', () => {
    it('should check multiple availabilities efficiently', async () => {
      const mockQuery = {
        in: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                date: '2024-01-15',
                res_type: 'pool',
                category: null,
                available: false,
                reason: 'Maintenance'
              }
            ],
            error: null
          })
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      });

      const queries = [
        { date: '2024-01-15', res_type: 'pool' as ReservationType },
        { date: '2024-01-16', res_type: 'pool' as ReservationType }
      ];

      const result = await service.checkMultipleAvailabilities(queries);
      
      expect(result.size).toBe(2);
      expect(result.get('2024-01-15-pool-null')?.isAvailable).toBe(false);
      expect(result.get('2024-01-16-pool-null')?.isAvailable).toBe(true);
    });
  });

  describe('getNextAvailableDate', () => {
    it('should return next available date', async () => {
      const mockQuery = {
        order: vi.fn().mockResolvedValue({
          data: [
            { date: '2024-01-15', available: false },
            { date: '2024-01-16', available: false },
            { date: '2024-01-17', available: true }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue(mockQuery)
              })
            })
          })
        })
      });

      const result = await service.getNextAvailableDate('pool');
      
      expect(result).toBe('2024-01-17');
    });

    it('should return null when no available dates found', async () => {
      const mockQuery = {
        order: vi.fn().mockResolvedValue({
          data: [
            { date: '2024-01-15', available: false },
            { date: '2024-01-16', available: false }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue(mockQuery)
              })
            })
          })
        })
      });

      const result = await service.getNextAvailableDate('pool');
      
      expect(result).toBeNull();
    });
  });

  describe('createAvailabilityOverride', () => {
    it('should create availability override successfully', async () => {
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: { id: 1, date: '2024-01-15', res_type: 'pool', available: false },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery)
        })
      });

      const result = await service.createAvailabilityOverride({
        date: '2024-01-15',
        res_type: 'pool',
        available: false,
        reason: 'Maintenance'
      });
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle creation errors', async () => {
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Duplicate key' }
        })
      };
      
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery)
        })
      });

      const result = await service.createAvailabilityOverride({
        date: '2024-01-15',
        res_type: 'pool',
        available: false
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate key');
    });
  });

  describe('updateAvailabilityOverride', () => {
    it('should update availability override successfully', async () => {
      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: { id: 1, available: true },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(mockQuery)
          })
        })
      });

      const result = await service.updateAvailabilityOverride(1, {
        available: true
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('deleteAvailabilityOverride', () => {
    it('should delete availability override successfully', async () => {
      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue(mockQuery)
      });

      const result = await service.deleteAvailabilityOverride(1);
      
      expect(result.success).toBe(true);
    });
  });
});
