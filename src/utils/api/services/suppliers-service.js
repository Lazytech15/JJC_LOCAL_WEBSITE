import { BaseAPIService } from "../core/base-api.js"

export class SuppliersService extends BaseAPIService {
  /**
   * Get all suppliers with optional filtering
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Response with suppliers data
   */
  async getSuppliers(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    const endpoint = queryParams ? `/api/items/suppliers?${queryParams}` : '/api/items/suppliers'
    return this.request(endpoint)
  }

  /**
   * Get a single supplier by ID
   * @param {string|number} id - Supplier ID
   * @returns {Promise<Object>} Supplier data
   */
  async getSupplier(id) {
    return this.request(`/api/items/suppliers/${id}`)
  }

  /**
   * Create a new supplier
   * @param {Object} supplierData - Supplier data
   * @returns {Promise<Object>} Created supplier data
   */
  async createSupplier(supplierData) {
    return this.request('/api/items/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    })
  }

  /**
   * Update an existing supplier
   * @param {string|number} id - Supplier ID
   * @param {Object} supplierData - Updated supplier data
   * @returns {Promise<Object>} Updated supplier data
   */
  async updateSupplier(id, supplierData) {
    return this.request(`/api/items/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    })
  }

  /**
   * Delete a supplier
   * @param {string|number} id - Supplier ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSupplier(id) {
    return this.request(`/api/items/suppliers/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get supplier metrics (purchase orders, items count, etc.)
   * @param {string|number} id - Supplier ID
   * @returns {Promise<Object>} Supplier metrics
   */
  async getSupplierMetrics(id) {
    return this.request(`/api/items/suppliers/${id}/metrics`)
  }

  /**
   * Validate supplier data before submission
   * @param {Object} supplierData - Supplier data to validate
   * @returns {Object} Validation result with errors array
   */
  validateSupplierData(supplierData) {
    const errors = [];

    // Required fields validation
    if (!supplierData.name?.trim()) {
      errors.push('Supplier name is required');
    }

    if (!supplierData.contact_person?.trim()) {
      errors.push('Contact person is required');
    }

    if (!supplierData.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!supplierData.phone?.trim()) {
      errors.push('Phone number is required');
    }

    // Optional field validation
    if (supplierData.website && !/^https?:\/\/.+/.test(supplierData.website)) {
      errors.push('Website must be a valid URL starting with http:// or https://');
    }

    if (supplierData.email && supplierData.email.length > 255) {
      errors.push('Email address is too long (maximum 255 characters)');
    }

    if (supplierData.name && supplierData.name.length > 255) {
      errors.push('Supplier name is too long (maximum 255 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format supplier data for display
   * @param {Object} supplier - Raw supplier data
   * @returns {Object} Formatted supplier data
   */
  formatSupplierData(supplier) {
    if (!supplier) return null;

    return {
      ...supplier,
      full_address: this.getFullAddress(supplier),
      display_name: `${supplier.name} (${supplier.contact_person})`,
      created_date: new Date(supplier.created_at).toLocaleDateString(),
      updated_date: new Date(supplier.updated_at).toLocaleDateString(),
      status_badge: {
        active: { text: 'Active', class: 'badge-success' },
        inactive: { text: 'Inactive', class: 'badge-secondary' },
        suspended: { text: 'Suspended', class: 'badge-warning' }
      }[supplier.status] || { text: supplier.status, class: 'badge-secondary' }
    };
  }

  /**
   * Get formatted full address
   * @param {Object} supplier - Supplier data
   * @returns {string} Formatted address
   */
  getFullAddress(supplier) {
    const parts = [
      supplier.address,
      supplier.city,
      supplier.country,
      supplier.postal_code
    ].filter(part => part && part.trim());

    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  }

  /**
   * Get suppliers list formatted for dropdowns/selects
   * @returns {Promise<Array>} List of suppliers with id and label
   */
  async getSuppliersForSelect() {
    try {
      const response = await this.getSuppliers({ active_only: true });
      const suppliers = response.suppliers || [];
      return suppliers.map(supplier => ({
        id: supplier.id,
        label: supplier.name,
        value: supplier.id
      }));
    } catch (error) {
      console.error('Error fetching suppliers for select:', error);
      return [];
    }
  }
}