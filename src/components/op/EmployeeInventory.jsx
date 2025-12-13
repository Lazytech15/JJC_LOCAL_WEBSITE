import { useState, useEffect } from 'react';
import { 
  Package, UserCircle, Calendar, AlertCircle, CheckCircle, 
  Clock, Search, Filter, Download, Plus, 
  Trash2, XCircle, ChevronDown, ChevronUp, Users
} from 'lucide-react';

export default function EmployeeInventoryTab({ isDarkMode, apiService }) {
  const [employeeGroups, setEmployeeGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'all'
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  
  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter === 'active') {
        // Only get non-completed checkouts
        params.include_completed = false;
      }

      const checkoutsData = await apiService.employeeInventory.getAllCheckouts(params);
      const statsData = await apiService.employeeInventory.getStatistics();

      // Group checkouts by employee
      const grouped = groupCheckoutsByEmployee(checkoutsData?.data || checkoutsData || []);
      
      setEmployeeGroups(grouped);
      setStatistics(statsData?.statistics || statsData || null);
    } catch (err) {
      console.error('Failed to load employee inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupCheckoutsByEmployee = (checkouts) => {
    const groups = {};
    
    checkouts.forEach(checkout => {
      const key = checkout.employee_uid;
      if (!groups[key]) {
        groups[key] = {
          employee_uid: checkout.employee_uid,
          employee_name: checkout.employee_name,
          employee_barcode: checkout.employee_barcode,
          checkouts: [],
          total_quantity: 0,
          total_value: 0,
          active_count: 0
        };
      }
      
      groups[key].checkouts.push(checkout);
      groups[key].total_quantity += parseFloat(checkout.quantity_checked_out || 0);
      groups[key].total_value += parseFloat(checkout.total_cost || 0);
      if (!checkout.is_completed) {
        groups[key].active_count++;
      }
    });

    // Convert to array and sort by active count (descending)
    return Object.values(groups).sort((a, b) => b.active_count - a.active_count);
  };

  const filteredEmployeeGroups = employeeGroups.filter(group => {
    const matchesSearch = !searchTerm || 
      group.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.employee_barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.checkouts.some(c => c.material_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const toggleEmployee = (employeeUid) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeUid)) {
      newExpanded.delete(employeeUid);
    } else {
      newExpanded.add(employeeUid);
    }
    setExpandedEmployees(newExpanded);
  };

  const expandAll = () => {
    setExpandedEmployees(new Set(filteredEmployeeGroups.map(g => g.employee_uid)));
  };

  const collapseAll = () => {
    setExpandedEmployees(new Set());
  };

  const calculateBalance = (checkout) => {
    return (checkout.quantity_checked_out || 0) - (checkout.quantity_used || 0);
  };

  const handleMarkAsUsed = async (checkout) => {
    const balance = calculateBalance(checkout);
    const quantity = prompt(`Enter quantity used (max: ${balance} ${checkout.unit_of_measure}):`);
    if (!quantity) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || qty > balance) {
      alert('Invalid quantity');
      return;
    }

    try {
      await apiService.employeeInventory.markAsUsed(checkout.id, qty);
      await loadData();
    } catch (err) {
      alert('Failed to mark as used: ' + err.message);
    }
  };

  const handleMarkAsLost = async (checkout) => {
    if (!confirm(`Mark "${checkout.material_name}" as lost? This cannot be undone.`)) return;

    const notes = prompt('Enter reason for loss:');
    
    try {
      await apiService.employeeInventory.markAsLost(checkout.id, notes || 'Marked as lost');
      await loadData();
    } catch (err) {
      alert('Failed to mark as lost: ' + err.message);
    }
  };

  const handleDelete = async (checkout) => {
    if (!confirm(`Delete checkout record for "${checkout.material_name}"?`)) return;

    try {
      await apiService.employeeInventory.deleteCheckout(checkout.id);
      await loadData();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
            <Package className="w-7 h-7" />
            Employee Consumables
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Track consumable materials checked out to employees
          </p>
        </div>
        
        <button
          onClick={() => setShowCheckoutModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Checkout
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={filteredEmployeeGroups.length}
            icon={<Users className="w-5 h-5" />}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Total Checkouts"
            value={statistics.total_checkouts || 0}
            icon={<Package className="w-5 h-5" />}
            color="purple"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Active Checkouts"
            value={statistics.active_checkouts || 0}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Total Value"
            value={`₱${(statistics.total_active_value || 0).toLocaleString()}`}
            icon={<Package className="w-5 h-5" />}
            color="green"
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['active', 'all'].map(view => (
          <button
            key={view}
            onClick={() => setStatusFilter(view)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === view
                ? 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {view === 'active' ? 'Active Only' : 'All Checkouts'}
          </button>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees or materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-gray-300 text-gray-800'
            }`}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error: {error}
        </div>
      )}

      {/* Employee Groups */}
      <div className="space-y-3">
        {filteredEmployeeGroups.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No checkouts found</p>
          </div>
        ) : (
          filteredEmployeeGroups.map(group => (
            <EmployeeGroupCard
              key={group.employee_uid}
              group={group}
              isDarkMode={isDarkMode}
              isExpanded={expandedEmployees.has(group.employee_uid)}
              onToggle={() => toggleEmployee(group.employee_uid)}
              onMarkUsed={handleMarkAsUsed}
              onMarkLost={handleMarkAsLost}
              onDelete={handleDelete}
              formatDate={formatDate}
              calculateBalance={calculateBalance}
            />
          ))
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <CheckoutModal
          isDarkMode={isDarkMode}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            setShowCheckoutModal(false);
            loadData();
          }}
          apiService={apiService}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, isDarkMode }) {
  const colors = {
    blue: isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    purple: isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
    yellow: isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
    green: isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
  };

  return (
    <div className={`p-4 rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}

function EmployeeGroupCard({ 
  group, isDarkMode, isExpanded, onToggle, 
  onMarkUsed, onMarkLost, onDelete, formatDate, calculateBalance 
}) {
  return (
    <div className={`rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Employee Header */}
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-3 rounded-lg ${
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <UserCircle className={`w-6 h-6 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <div className="text-left min-w-0 flex-1">
            <h3 className={`font-semibold text-lg truncate ${
              isDarkMode ? 'text-gray-100' : 'text-gray-800'
            }`}>
              {group.employee_name}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {group.employee_barcode} • {group.checkouts.length} item{group.checkouts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {group.active_count} Active
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              ₱{group.total_value.toLocaleString()}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Checkouts */}
      {isExpanded && (
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-4 space-y-3">
            {group.checkouts.map(checkout => (
              <CheckoutItem
                key={checkout.id}
                checkout={checkout}
                isDarkMode={isDarkMode}
                onMarkUsed={onMarkUsed}
                onMarkLost={onMarkLost}
                onDelete={onDelete}
                formatDate={formatDate}
                calculateBalance={calculateBalance}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutItem({ 
  checkout, isDarkMode, onMarkUsed, onMarkLost, onDelete, 
  formatDate, calculateBalance 
}) {
  const balance = calculateBalance(checkout);
  const isCompleted = checkout.is_completed;

  return (
    <div className={`p-4 rounded-lg border ${
      isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`font-medium truncate ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {checkout.material_name}
            </h4>
            {isCompleted && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isDarkMode 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-green-100 text-green-700'
              }`}>
                Completed
              </span>
            )}
            {checkout.status === 'lost' && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isDarkMode 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-red-100 text-red-700'
              }`}>
                Lost
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              <span className="font-medium">Checked Out:</span> {checkout.quantity_checked_out} {checkout.unit_of_measure}
            </div>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              <span className="font-medium">Used:</span> {checkout.quantity_used || 0} {checkout.unit_of_measure}
            </div>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              <span className="font-medium">Balance:</span> 
              <span className={`ml-1 font-semibold ${
                balance > 0 
                  ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                  : isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {balance} {checkout.unit_of_measure}
              </span>
            </div>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              <span className="font-medium">Date:</span> {formatDate(checkout.checkout_date)}
            </div>
          </div>

          {checkout.purpose && (
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="font-medium">Purpose:</span> {checkout.purpose}
            </div>
          )}

          {checkout.project_name && (
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="font-medium">Project:</span> {checkout.project_name}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {!isCompleted && balance > 0 && (
            <>
              <button
                onClick={() => onMarkUsed(checkout)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title="Mark as Used"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMarkLost(checkout)}
                className="p-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                title="Mark as Lost"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(checkout)}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({ isDarkMode, onClose, onSuccess, apiService }) {
  const [formData, setFormData] = useState({
    employee_uid: '',
    employee_barcode: '',
    employee_name: '',
    material_name: '',
    quantity_checked_out: '',
    unit_of_measure: 'pcs',
    purpose: '',
    project_name: '',
    unit_cost: '',
    is_consumable: true
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.employeeInventory.createCheckout(formData);
      onSuccess();
    } catch (err) {
      alert('Failed to create checkout: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-6">
          <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            New Checkout
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Employee UID *</label>
                <input
                  type="text"
                  required
                  value={formData.employee_uid}
                  onChange={(e) => setFormData({...formData, employee_uid: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Employee Barcode *</label>
                <input
                  type="text"
                  required
                  value={formData.employee_barcode}
                  onChange={(e) => setFormData({...formData, employee_barcode: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Employee Name *</label>
              <input
                type="text"
                required
                value={formData.employee_name}
                onChange={(e) => setFormData({...formData, employee_name: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Material Name *</label>
              <input
                type="text"
                required
                value={formData.material_name}
                onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.quantity_checked_out}
                  onChange={(e) => setFormData({...formData, quantity_checked_out: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Unit</label>
                <input
                  type="text"
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="pcs, kg, m, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Purpose</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Why is this material being checked out?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Project Name</label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Associated project or job"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Unit Cost (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                placeholder="Cost per unit"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Checkout'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}