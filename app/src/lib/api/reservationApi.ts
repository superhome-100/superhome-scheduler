import { reservationService } from '../services/reservationService';
import { validateCreateReservation, validateUpdateReservation, sanitizeReservationData } from '../utils/reservationValidation';
import type { 
  CreateReservationData, 
  UpdateReservationData, 
  CompleteReservation,
  ReservationQueryOptions,
  ServiceResponse 
} from '../services/reservationService';

/**
 * High-level API client for reservation operations
 * Provides validation, error handling, and data transformation
 */
export class ReservationApi {
  /**
   * Create a new reservation with validation
   */
  async createReservation(
    uid: string, 
    reservationData: CreateReservationData
  ): Promise<ServiceResponse<CompleteReservation>> {
    try {
      // Sanitize input data
      const sanitizedData = sanitizeReservationData(reservationData);

      // Validate data
      const validation = validateCreateReservation(sanitizedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Create reservation
      return await reservationService.createReservation(uid, sanitizedData);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get reservations with optional filtering
   */
  async getReservations(options: ReservationQueryOptions = {}): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservations(options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a single reservation
   */
  async getReservation(uid: string, res_date: string): Promise<ServiceResponse<CompleteReservation>> {
    try {
      return await reservationService.getReservation(uid, res_date);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a reservation with validation
   */
  async updateReservation(
    uid: string,
    res_date: string,
    updateData: UpdateReservationData
  ): Promise<ServiceResponse<CompleteReservation>> {
    try {
      // Sanitize input data
      const sanitizedData = sanitizeReservationData(updateData);

      // Validate data
      const validation = validateUpdateReservation(sanitizedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Update reservation
      return await reservationService.updateReservation(uid, res_date, sanitizedData);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a reservation
   */
  async deleteReservation(uid: string, res_date: string): Promise<ServiceResponse<boolean>> {
    try {
      return await reservationService.deleteReservation(uid, res_date);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update reservation status
   */
  async updateReservationStatus(
    uid: string,
    res_date: string,
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<ServiceResponse<CompleteReservation>> {
    return this.updateReservation(uid, res_date, { res_status: status });
  }

  /**
   * Bulk update reservation statuses
   */
  async bulkUpdateStatus(
    reservations: Array<{ uid: string; res_date: string }>,
    status: 'pending' | 'confirmed' | 'rejected'
  ): Promise<ServiceResponse<number>> {
    try {
      return await reservationService.bulkUpdateStatus(reservations, status);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's upcoming reservations
   */
  async getUpcomingReservations(uid: string, limit: number = 10): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getUpcomingReservations(uid, limit);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's past reservations
   */
  async getPastReservations(uid: string, limit: number = 10): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getPastReservations(uid, limit);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get reservations by status
   */
  async getReservationsByStatus(
    status: 'pending' | 'confirmed' | 'rejected',
    options: Omit<ReservationQueryOptions, 'res_status'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservationsByStatus(status, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get reservations by type
   */
  async getReservationsByType(
    type: 'pool' | 'open_water' | 'classroom',
    options: Omit<ReservationQueryOptions, 'res_type'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservationsByType(type, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get pending reservations (admin function)
   */
  async getPendingReservations(limit: number = 50): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservationsByStatus('pending', { limit });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Approve a reservation
   */
  async approveReservation(uid: string, res_date: string): Promise<ServiceResponse<CompleteReservation>> {
    return this.updateReservationStatus(uid, res_date, 'confirmed');
  }

  /**
   * Reject a reservation
   */
  async rejectReservation(uid: string, res_date: string): Promise<ServiceResponse<CompleteReservation>> {
    return this.updateReservationStatus(uid, res_date, 'rejected');
  }

  /**
   * Get reservations for a specific date range
   */
  async getReservationsByDateRange(
    startDate: string,
    endDate: string,
    options: Omit<ReservationQueryOptions, 'start_date' | 'end_date'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservations({
        ...options,
        start_date: startDate,
        end_date: endDate
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get reservations for a specific user and date range
   */
  async getUserReservationsByDateRange(
    uid: string,
    startDate: string,
    endDate: string,
    options: Omit<ReservationQueryOptions, 'uid' | 'start_date' | 'end_date'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      return await reservationService.getReservations({
        ...options,
        uid,
        start_date: startDate,
        end_date: endDate
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const reservationApi = new ReservationApi();

// Export types for convenience
export type {
  CreateReservationData,
  UpdateReservationData,
  CompleteReservation,
  ReservationQueryOptions,
  ServiceResponse
} from '../services/reservationService';
