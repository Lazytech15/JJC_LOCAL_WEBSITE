// ============================================================================
// services/materials-service.js - Material Management Service (3-Table Structure)
// ============================================================================
import { BaseAPIService } from "../core/base-api.js";

export class MaterialsService extends BaseAPIService {
    // ==================== MATERIALS (CHECKOUTS) - materials_materials ====================

    /**
     * Get all material checkouts with optional filtering
     * @param {Object} params - Query parameters
     * @param {number} [params.subphase_id] - Filter by subphase
     * @param {number} [params.id] - Get specific material
     * @param {string} [params.status] - Filter by status (checked_out, in_use, completed, cancelled)
     * @param {string} [params.employee_uid] - Filter by employee
     * @returns {Promise} Materials data
     */
    async getMaterials(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.subphase_id) queryParams.append('subphase_id', params.subphase_id);
        if (params.id) queryParams.append('id', params.id);
        if (params.status) queryParams.append('status', params.status);
        if (params.employee_uid) queryParams.append('employee_uid', params.employee_uid);

        const url = `/api/materials/materials${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return this.request(url);
    }

    /**
     * Get materials for a specific subphase
     * @param {number|string} subphaseId - Subphase ID
     * @returns {Promise<Array>} Array of materials for the subphase
     */
    async getSubphaseMaterials(subphaseId) {
        return this.request(`/api/materials/subphase-materials?subphase_id=${subphaseId}`);
    }

    /**
     * Get single material checkout by ID
     * @param {number|string} materialId - Material ID
     * @returns {Promise} Material data
     */
    async getMaterial(materialId) {
        return this.getMaterials({ id: materialId });
    }

    /**
     * Create new material checkout
     * @param {Object} materialData - Material checkout data
     * @param {number} materialData.subphase_id - Subphase ID (required)
     * @param {string} materialData.material_name - Material name (required)
     * @param {number} materialData.material_quantity - Required quantity (required)
     * @param {string} materialData.checked_out_by - Employee barcode (required)
     * @param {string} materialData.checked_out_by_name - Employee name (required)
     * @param {string} materialData.checked_out_by_uid - Employee UID (required)
     * @param {string} [materialData.unit_of_measure='pcs'] - Unit of measure
     * @param {string} [materialData.status='active'] - Initial status
     * @param {string} [materialData.notes] - Additional notes
     * @returns {Promise} Created material
     */
    async createMaterial(materialData) {
        try {
            console.log('➕ Creating material checkout:', materialData);
            const data = await this.request('/api/materials/materials', {
                method: 'POST',
                body: JSON.stringify(materialData),
            });

            console.log('✅ Material checkout created:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to create material:', error);
            throw error;
        }
    }

    /**
     * Update material checkout
     * @param {number|string} materialId - Material ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} Updated material
     */
    async updateMaterial(materialId, updates) {
        try {
            console.log(`🔄 Updating material ${materialId}:`, updates);
            const data = await this.request(`/api/materials/materials?id=${materialId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });

            console.log('✅ Material updated');
            return data;
        } catch (error) {
            console.error('❌ Failed to update material:', error);
            throw error;
        }
    }

    /**
     * Delete material checkout
     * @param {number|string} materialId - Material ID
     * @returns {Promise} Success confirmation
     */
    async deleteMaterial(materialId) {
        return this.request(`/api/materials/materials?id=${materialId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Checkout material to an employee
     * @param {Object} checkoutData - Checkout information
     * @returns {Promise} Success confirmation
     */
    async checkoutMaterial(checkoutData) {
        return this.createMaterial(checkoutData);
    }

    /**
     * Mark material as completed
     * @param {number|string} materialId - Material ID
     * @param {number} quantityUsed - Quantity actually used
     * @returns {Promise} Success confirmation
     */
    async completeMaterial(materialId, quantityUsed) {
        return this.request('/api/materials/complete-material', {
            method: 'POST',
            body: JSON.stringify({
                material_id: materialId,
                quantity_used: quantityUsed
            })
        });
    }

    // ==================== RETURNED MATERIALS - materials_returned_materials ====================

    /**
     * Get returned materials with optional filtering
     * @param {Object} params - Query parameters
     * @param {number} [params.subphase_id] - Filter by subphase
     * @param {number} [params.id] - Get specific return
     * @param {boolean} [params.is_reusable] - Filter by reusability
     * @returns {Promise} Returned materials data
     */
    async getReturnedMaterials(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.subphase_id) queryParams.append('subphase_id', params.subphase_id);
        if (params.id) queryParams.append('id', params.id);
        if (params.is_reusable !== undefined) queryParams.append('is_reusable', params.is_reusable ? '1' : '0');

        const url = `/api/materials/returned-materials${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return this.request(url);
    }

    /**
     * Get single returned material by ID
     * @param {number|string} returnId - Return ID
     * @returns {Promise} Returned material data
     */
    async getReturnedMaterial(returnId) {
        return this.getReturnedMaterials({ id: returnId });
    }

    /**
     * Create returned material record
     * @param {Object} returnData - Return data
     * @param {number} [returnData.original_material_id] - Original checkout ID
     * @param {number} returnData.subphase_id - Subphase ID (required)
     * @param {string} returnData.material_name - Material name (required)
     * @param {number} returnData.quantity_returned - Quantity returned (required)
     * @param {string} returnData.returned_by - Employee barcode (required)
     * @param {string} returnData.returned_by_name - Employee name (required)
     * @param {string} returnData.returned_by_uid - Employee UID (required)
     * @param {string} [returnData.condition_status='good'] - Condition (good, damaged, unusable)
     * @param {string} [returnData.return_reason] - Reason for return
     * @param {boolean} [returnData.is_reusable=true] - Can be reused
     * @param {string} [returnData.storage_location] - Storage location
     * @returns {Promise} Created return record
     */
    async createReturnedMaterial(returnData) {
        try {
            console.log('↩️ Creating returned material:', returnData);
            const data = await this.request('/api/materials/returned-materials', {
                method: 'POST',
                body: JSON.stringify(returnData),
            });

            console.log('✅ Returned material recorded:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to create returned material:', error);
            throw error;
        }
    }

    /**
     * Return unused material (moves from checkout to returned)
     * @param {number|string} materialId - Original material checkout ID
     * @param {number} quantityReturned - Quantity being returned
     * @param {Object} [options] - Additional options
     * @param {string} [options.condition_status='good'] - Condition
     * @param {string} [options.return_reason] - Reason
     * @param {boolean} [options.is_reusable=true] - Reusable flag
     * @param {string} [options.storage_location] - Storage location
     * @param {string} [options.notes] - Notes
     * @returns {Promise} Success confirmation
     */
    async returnMaterial(materialId, quantityReturned, options = {}) {
        if (quantityReturned === undefined || quantityReturned === null) {
            throw new Error('quantityReturned is required');
        }

        return this.request('/api/materials/return-material', {
            method: 'POST',
            body: JSON.stringify({
                material_id: materialId,
                quantity_returned: quantityReturned,
                ...options
            })
        });
    }

    /**
     * Update returned material record
     * @param {number|string} returnId - Return ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} Updated return record
     */
    async updateReturnedMaterial(returnId, updates) {
        try {
            console.log(`🔄 Updating returned material ${returnId}:`, updates);
            const data = await this.request(`/api/materials/returned-materials?id=${returnId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });

            console.log('✅ Returned material updated');
            return data;
        } catch (error) {
            console.error('❌ Failed to update returned material:', error);
            throw error;
        }
    }

    /**
     * Delete returned material record
     * @param {number|string} returnId - Return ID
     * @returns {Promise} Success confirmation
     */
    async deleteReturnedMaterial(returnId) {
        return this.request(`/api/materials/returned-materials?id=${returnId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get reusable returned materials
     * @param {number} [subphaseId] - Optional subphase filter
     * @returns {Promise<Array>} Reusable materials
     */
    async getReusableMaterials(subphaseId = null) {
        const params = { is_reusable: true };
        if (subphaseId) params.subphase_id = subphaseId;
        return this.getReturnedMaterials(params);
    }

    // ==================== SCRAP MATERIALS - materials_scrap_materials ====================

    /**
     * Get scrap materials with optional filtering
     * @param {Object} params - Query parameters
     * @param {number} [params.subphase_id] - Filter by subphase
     * @param {number} [params.id] - Get specific scrap
     * @param {string} [params.scrap_type] - Filter by type (waste, defective, damaged, obsolete, other)
     * @returns {Promise} Scrap materials data
     */
    async getScrapMaterials(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.subphase_id) queryParams.append('subphase_id', params.subphase_id);
        if (params.id) queryParams.append('id', params.id);
        if (params.scrap_type) queryParams.append('scrap_type', params.scrap_type);

        const url = `/api/materials/scrap-materials${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return this.request(url);
    }

    /**
     * Get single scrap material by ID
     * @param {number|string} scrapId - Scrap ID
     * @returns {Promise} Scrap material data
     */
    async getScrapMaterial(scrapId) {
        return this.getScrapMaterials({ id: scrapId });
    }

    /**
     * Create scrap material record
     * @param {Object} scrapData - Scrap data
     * @param {number} [scrapData.original_material_id] - Original checkout ID
     * @param {number} scrapData.subphase_id - Subphase ID (required)
     * @param {string} scrapData.material_name - Material name (required)
     * @param {number} scrapData.quantity_scrapped - Quantity scrapped (required)
     * @param {string} scrapData.scrap_reason - Reason for scrap (required)
     * @param {string} scrapData.scrapped_by - Employee barcode (required)
     * @param {string} scrapData.scrapped_by_name - Employee name (required)
     * @param {string} scrapData.scrapped_by_uid - Employee UID (required)
     * @param {string} [scrapData.scrap_type='waste'] - Type (waste, defective, damaged, obsolete, other)
     * @param {string} [scrapData.disposal_method] - How to dispose
     * @param {boolean} [scrapData.is_recyclable=false] - Recyclable flag
     * @returns {Promise} Created scrap record
     */
    async createScrapMaterial(scrapData) {
        try {
            console.log('🗑️ Creating scrap material:', scrapData);
            const data = await this.request('/api/materials/scrap-materials', {
                method: 'POST',
                body: JSON.stringify(scrapData),
            });

            console.log('✅ Scrap material recorded:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to create scrap material:', error);
            throw error;
        }
    }

    /**
     * Scrap material (moves from checkout to scrap)
     * @param {number|string} materialId - Original material checkout ID
     * @param {number} quantityScrapped - Quantity being scrapped
     * @param {string} scrapReason - Reason for scrapping (required)
     * @param {Object} [options] - Additional options
     * @param {string} [options.scrap_type='waste'] - Scrap type
     * @param {string} [options.disposal_method] - Disposal method
     * @param {boolean} [options.is_recyclable=false] - Recyclable flag
     * @param {string} [options.notes] - Notes
     * @returns {Promise} Success confirmation
     */
    async scrapMaterial(materialId, quantityScrapped, scrapReason, options = {}) {
        if (!materialId || quantityScrapped === undefined || !scrapReason) {
            throw new Error('materialId, quantityScrapped, and scrapReason are required');
        }

        return this.request('/api/materials/scrap-material', {
            method: 'POST',
            body: JSON.stringify({
                material_id: materialId,
                quantity_scrapped: quantityScrapped,
                scrap_reason: scrapReason,
                ...options
            })
        });
    }

    /**
     * Update scrap material record
     * @param {number|string} scrapId - Scrap ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} Updated scrap record
     */
    async updateScrapMaterial(scrapId, updates) {
        try {
            console.log(`🔄 Updating scrap material ${scrapId}:`, updates);
            const data = await this.request(`/api/materials/scrap-materials?id=${scrapId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });

            console.log('✅ Scrap material updated');
            return data;
        } catch (error) {
            console.error('❌ Failed to update scrap material:', error);
            throw error;
        }
    }

    /**
     * Delete scrap material record
     * @param {number|string} scrapId - Scrap ID
     * @returns {Promise} Success confirmation
     */
    async deleteScrapMaterial(scrapId) {
        return this.request(`/api/materials/scrap-materials?id=${scrapId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get recyclable scrap materials
     * @param {number} [subphaseId] - Optional subphase filter
     * @returns {Promise<Array>} Recyclable scrap materials
     */
    async getRecyclableScrap(subphaseId = null) {
        const scraps = await this.getScrapMaterials(subphaseId ? { subphase_id: subphaseId } : {});
        return scraps.filter(s => s.is_recyclable);
    }

    // ==================== COMPLETE WORKFLOWS ====================

    /**
     * Complete material lifecycle with checkout and completion
     * @param {Object} data - Material data
     * @param {number} data.subphase_id - Subphase ID
     * @param {string} data.material_name - Material name
     * @param {number} data.material_quantity - Quantity
     * @param {string} data.checked_out_by - Employee barcode
     * @param {string} data.checked_out_by_name - Employee name
     * @param {string} data.checked_out_by_uid - Employee UID
     * @param {number} data.quantity_used - Quantity used
     * @returns {Promise} Result
     */
    async checkoutAndComplete(data) {
        try {
            // Create checkout
            const checkout = await this.createMaterial(data);

            // Mark as completed
            await this.completeMaterial(checkout.id, data.quantity_used);

            return {
                success: true,
                message: 'Material checked out and completed',
                checkout_id: checkout.id
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Checkout material and then return unused portion
     * @param {Object} checkoutData - Checkout data
     * @param {number} quantityUsed - Quantity actually used
     * @param {number} quantityReturned - Quantity to return
     * @param {Object} [returnOptions] - Return options
     * @returns {Promise} Result
     */
    async checkoutUseAndReturn(checkoutData, quantityUsed, quantityReturned, returnOptions = {}) {
        try {
            // Create checkout
            const checkout = await this.createMaterial(checkoutData);

            // Update with used quantity
            await this.updateMaterial(checkout.id, { quantity_used: quantityUsed });

            // Return unused portion
            await this.returnMaterial(checkout.id, quantityReturned, returnOptions);

            return {
                success: true,
                message: 'Material checked out, used, and returned',
                checkout_id: checkout.id
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==================== REPORTING & ANALYTICS ====================

    /**
     * Get comprehensive materials statistics
     * @returns {Promise} Statistics across all three tables
     */
    async getMaterialsStatistics() {
        return this.request('/api/materials/materials-statistics');
    }

    /**
     * Get materials summary for a subphase across all tables
     * @param {number|string} subphaseId - Subphase ID
     * @returns {Promise} Comprehensive summary
     */
    async getSubphaseMaterialSummary(subphaseId) {
        const [checkouts, returns, scraps] = await Promise.all([
            this.getMaterials({ subphase_id: subphaseId }),
            this.getReturnedMaterials({ subphase_id: subphaseId }),
            this.getScrapMaterials({ subphase_id: subphaseId })
        ]);

        return {
            checkouts: {
                count: checkouts.length,
                items: checkouts,
                total_quantity: checkouts.reduce((sum, m) => sum + parseFloat(m.material_quantity || 0), 0),
                total_used: checkouts.reduce((sum, m) => sum + parseFloat(m.quantity_used || 0), 0)
            },
            returns: {
                count: returns.length,
                items: returns,
                total_returned: returns.reduce((sum, r) => sum + parseFloat(r.quantity_returned || 0), 0),
                reusable_count: returns.filter(r => r.is_reusable).length
            },
            scraps: {
                count: scraps.length,
                items: scraps,
                total_scrapped: scraps.reduce((sum, s) => sum + parseFloat(s.quantity_scrapped || 0), 0),
                recyclable_count: scraps.filter(s => s.is_recyclable).length
            }
        };
    }

    /**
     * Get material efficiency report
     * @returns {Promise} Efficiency statistics
     */
    async getMaterialEfficiency() {
        return this.request('/api/materials/material-efficiency');
    }

    /**
     * Get employee materials (checkouts only)
     * @param {string} employeeUid - Employee UID
     * @returns {Promise<Array>} Materials checked out by employee
     */
    async getEmployeeMaterials(employeeUid) {
        return this.getMaterials({ employee_uid: employeeUid });
    }

    /**
     * Get overdue checkouts
     * @param {number} daysThreshold - Days since checkout (default: 7)
     * @returns {Promise<Array>} Overdue checkouts
     */
    async getOverdueCheckouts(daysThreshold = 7) {
        return this.request(`/api/materials/overdue-materials?days=${daysThreshold}`);
    }

    // ==================== VALIDATION ====================

    /**
     * Validate material checkout data
     * @param {Object} materialData - Material data to validate
     * @returns {Object} Validation result
     */
    validateCheckoutData(materialData) {
        const errors = [];

        if (!materialData.subphase_id) errors.push('subphase_id is required');
        if (!materialData.material_name?.trim()) errors.push('material_name is required');
        if (materialData.material_quantity === undefined || materialData.material_quantity === null) {
            errors.push('material_quantity is required');
        } else if (parseFloat(materialData.material_quantity) <= 0) {
            errors.push('material_quantity must be positive');
        }
        if (!materialData.checked_out_by) errors.push('checked_out_by is required');
        if (!materialData.checked_out_by_name) errors.push('checked_out_by_name is required');
        if (!materialData.checked_out_by_uid) errors.push('checked_out_by_uid is required');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate return data
     * @param {Object} returnData - Return data to validate
     * @returns {Object} Validation result
     */
    validateReturnData(returnData) {
        const errors = [];

        if (!returnData.subphase_id) errors.push('subphase_id is required');
        if (!returnData.material_name?.trim()) errors.push('material_name is required');
        if (returnData.quantity_returned === undefined || returnData.quantity_returned === null) {
            errors.push('quantity_returned is required');
        } else if (parseFloat(returnData.quantity_returned) <= 0) {
            errors.push('quantity_returned must be positive');
        }
        if (!returnData.returned_by) errors.push('returned_by is required');
        if (!returnData.returned_by_name) errors.push('returned_by_name is required');
        if (!returnData.returned_by_uid) errors.push('returned_by_uid is required');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate scrap data
     * @param {Object} scrapData - Scrap data to validate
     * @returns {Object} Validation result
     */
    validateScrapData(scrapData) {
        const errors = [];

        if (!scrapData.subphase_id) errors.push('subphase_id is required');
        if (!scrapData.material_name?.trim()) errors.push('material_name is required');
        if (scrapData.quantity_scrapped === undefined || scrapData.quantity_scrapped === null) {
            errors.push('quantity_scrapped is required');
        } else if (parseFloat(scrapData.quantity_scrapped) <= 0) {
            errors.push('quantity_scrapped must be positive');
        }
        if (!scrapData.scrap_reason?.trim()) errors.push('scrap_reason is required');
        if (!scrapData.scrapped_by) errors.push('scrapped_by is required');
        if (!scrapData.scrapped_by_name) errors.push('scrapped_by_name is required');
        if (!scrapData.scrapped_by_uid) errors.push('scrapped_by_uid is required');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}