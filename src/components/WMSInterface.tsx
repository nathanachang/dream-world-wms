import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Item, Order, OrderStatus } from '../types';
import { 
    PackageIcon, ShoppingCartIcon, BarChart3Icon, SearchIcon, 
    AlertCircleIcon, XIcon, CheckCircleIcon, ClockIcon, TruckIcon,
    MapPinIcon, DollarSignIcon, Edit3Icon, CheckIcon, EyeIcon, 
    TrendingUpIcon, PrinterIcon, DownloadIcon, LogOutIcon 
} from './icons';
import { fetchItems, fetchOrders, updateItem, updateOrderStatus, updateOrderTracking } from '../services/api';

const WMSInterface = ({ onLogout }: { onLogout: () => void }) => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [inventory, setInventory] = useState<Item[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemType, setSelectedItemType] = useState('all');
    const [selectedBin, setSelectedBin] = useState('all');
    const [dateRange, setDateRange] = useState('7');
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
    const [orderToUpdateStatus, setOrderToUpdateStatus] = useState<Order | null>(null);
    const [editingCarrier, setEditingCarrier] = useState('');
    const [editingTrackingNumber, setEditingTrackingNumber] = useState('');
    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [editingItemDetails, setEditingItemDetails] = useState<Item | null>(null);
    const [activeStockFilters, setActiveStockFilters] = useState<('low' | 'out')[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Item; direction: 'ascending' | 'descending' } | null>(null);

    const allOrderStatuses: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    const loadInventory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchItems();
            setInventory(data);
        } catch (err) {
            setError('Failed to fetch inventory.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchOrders();
            setOrders(data);
        } catch (err) {
            setError('Failed to fetch orders.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'inventory') {
            loadInventory();
        } else if (activeTab === 'orders') {
            loadOrders();
        }
    }, [activeTab, loadInventory, loadOrders]);

    const uniqueItemTypes = useMemo(() => Array.from(new Set(inventory.map(item => item.item_type).filter(Boolean))), [inventory]);
    const uniqueBins = useMemo(() => Array.from(new Set(inventory.map(item => item.bin))), [inventory]);

    const filteredInventory = useMemo(() => {
        let sortableItems = [...inventory];
        
        let filtered = inventory.filter(item => {
            const matchesSearch = item.item_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.bin.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesItemType = selectedItemType === 'all' || item.item_type === selectedItemType;
            const matchesBin = selectedBin === 'all' || item.bin === selectedBin;
            return matchesSearch && matchesItemType && matchesBin;
        });

        if (activeStockFilters.length > 0) {
            filtered = filtered.filter(item => {
                if (activeStockFilters.includes('low') && item.qty > 0 && item.qty <= 100) {
                    return true;
                }
                if (activeStockFilters.includes('out') && item.qty === 0) {
                    return true;
                }
                return false;
            });
        }
        
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (!aValue) {
                    return 1;
                }
                if (!bValue) {
                    return -1;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }


        return filtered;
    }, [inventory, searchTerm, selectedItemType, selectedBin, activeStockFilters, sortConfig]);
    
    const requestSort = (key: keyof Item) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleSaveItemDetails = async () => {
        if (!editingItemDetails) return;

        const originalInventory = [...inventory];
        
        // Optimistic update
        setInventory(prev => prev.map(item => item.sku === editingItemDetails.sku ? editingItemDetails : item));
        closeEditItemModal();
        setError(null);

        try {
            await updateItem(editingItemDetails.sku, editingItemDetails);
        } catch (err) {
            setError('Failed to update item. Reverting changes.');
            setInventory(originalInventory);
        }
    };
    
    const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        const originalOrders = [...orders];
        const orderToUpdate = orders.find(o => o.order_id === orderId);
        if (!orderToUpdate) return;

        const updatedOrder = { ...orderToUpdate, status: newStatus };
        const customerId = orderToUpdate.customer_id;

        // Optimistic update
        setOrders(prev => prev.map(order => order.order_id === orderId ? updatedOrder : order));
        closeStatusUpdateModal();
        setError(null);

        try {
            await updateOrderStatus(orderId, customerId, newStatus);
        } catch (err) {
            setError('Failed to update order status. Reverting changes.');
            // Revert on error
            setOrders(originalOrders);
        }
    };

    const handleUpdateTrackingDetails = async () => {
        if (!selectedOrder) return;

        const originalOrders = [...orders];
        const updatedOrder = { 
            ...selectedOrder, 
            carrier: editingCarrier, 
            tracking_number: editingTrackingNumber 
        };

        // Optimistic update
        setOrders(prev => prev.map(order => order.order_id === selectedOrder.order_id ? updatedOrder : order));
        closeOrderDetailsModal();
        setError(null);

        try {
            await updateOrderTracking(selectedOrder.order_id, selectedOrder.customer_id, {
                carrier: editingCarrier,
                tracking_number: editingTrackingNumber,
            });
        } catch (err) {
            setError('Failed to update tracking details. Reverting changes.');
            setOrders(originalOrders);
        }
    };
    
    const openEditItemModal = (item: Item) => {
        setEditingItemDetails({ ...item });
        setShowEditItemModal(true);
    };

    const closeEditItemModal = () => {
        setEditingItemDetails(null);
        setShowEditItemModal(false);
    };

    const handleItemDetailChange = (field: keyof Item, value: any) => {
        if (editingItemDetails) {
            setEditingItemDetails({ ...editingItemDetails, [field]: value });
        }
    };
    
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if ((value === "" || /^\d*\.?\d{0,2}$/.test(value)) && editingItemDetails) {
            setEditingItemDetails({ ...editingItemDetails, price: value as any });
        }
    };

    const formatPriceOnBlur = () => {
        if (editingItemDetails) {
            const price = parseFloat(editingItemDetails.price as any);
            const formattedPrice = isNaN(price) ? 0.00 : price;
            setEditingItemDetails({ ...editingItemDetails, price: formattedPrice });
        }
    };

    const handleQtyAdjustment = (amount: number) => {
        if (editingItemDetails) {
            const newQty = Math.max(0, editingItemDetails.qty + amount);
            setEditingItemDetails({ ...editingItemDetails, qty: newQty });
        }
    };
    
    const openStatusUpdateModal = (order: Order) => {
        setOrderToUpdateStatus(order);
        setShowStatusUpdateModal(true);
    };

    const closeStatusUpdateModal = () => {
        setOrderToUpdateStatus(null);
        setShowStatusUpdateModal(false);
    };

    const getStockStatus = (qty: number) => {
        if (qty === 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-100' };
        if (qty <= 100) return { status: 'low', color: 'text-orange-600', bg: 'bg-orange-100' };
        return { status: 'good', color: 'text-green-600', bg: 'bg-green-100' };
    };

    const formatDateTime = (dateTime: Date) => {
        return new Date(dateTime).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getOrderStatus = (order: Order) => {
        switch (order.status.toLowerCase()) {
            case 'shipped': return { status: order.status, color: 'text-green-600', bg: 'bg-green-100', icon: TruckIcon };
            case 'delivered': return { status: order.status, color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircleIcon };
            case 'pending': return { status: order.status, color: 'text-yellow-600', bg: 'bg-yellow-100', icon: ClockIcon };
            case 'cancelled': return { status: order.status, color: 'text-red-600', bg: 'bg-red-100', icon: XIcon };
            case 'processing': return { status: order.status, color: 'text-blue-600', bg: 'bg-blue-100', icon: PackageIcon };
            default: return { status: order.status, color: 'text-gray-600', bg: 'bg-gray-100', icon: ClockIcon };
        }
    };

    const getTotalOrderValue = () => orders.reduce((sum, order) => sum + order.subtotal, 0);
    const getTotalInventoryItems = () => inventory.reduce((sum, item) => sum + item.qty, 0);
    const getUniqueSKUs = () => Array.from(new Set(inventory.map(i => i.sku))).length;

    const handleStockFilter = (filter: 'low' | 'out') => {
        setActiveStockFilters(prev => 
            prev.includes(filter) 
                ? prev.filter(f => f !== filter) 
                : [...prev, filter]
        );
    };
    
    const getAnalyticsData = () => {
        const days = parseInt(dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const recentOrders = orders.filter(order => new Date(order.timestamp) >= cutoffDate);
        const totalRevenue = recentOrders.reduce((sum, order) => sum + order.subtotal, 0);
        const avgOrderValue = recentOrders.length > 0 ? totalRevenue / recentOrders.length : 0;
        const ordersPerDay = recentOrders.length > 0 ? recentOrders.length / days : 0;
        const shippedOrders = recentOrders.filter(o => o.status === 'Shipped' || o.status === 'Delivered').length;
        const fulfillmentRate = recentOrders.length > 0 ? (shippedOrders / recentOrders.length) * 100 : 0;
        const productSales: { [key: string]: number } = {};
        recentOrders.forEach(order => {
            order.item_list.forEach(item => {
                const key = `${item.item_desc} (${item.item_type})`;
                productSales[key] = (productSales[key] || 0) + item.qty;
            });
        });
        const topProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, qty]) => ({ name, qty }));
        const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
        const lowStockItems = inventory.filter(item => item.qty > 0 && item.qty <= 100).length;
        const outOfStockItems = inventory.filter(item => item.qty === 0).length;
        const dailyRevenue = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dayOrders = recentOrders.filter(o => new Date(o.timestamp).toDateString() === date.toDateString());
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: dayOrders.reduce((sum, order) => sum + order.subtotal, 0)
            };
        });
        return { totalRevenue, avgOrderValue, ordersPerDay, fulfillmentRate, topProducts, totalInventoryValue, lowStockItems, outOfStockItems, dailyRevenue };
    };
    
    const printOrderSlip = (order: Order) => {
        const slipContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Order Slip - ${order.order_id}</title>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>
                    body { font-family: Arial, sans-serif; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body class="p-4">
                <div class="max-w-4xl mx-auto bg-white p-8 border border-gray-300">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h1 class="text-3xl font-bold">Dream World</h1>
                            <p>123 Warehouse St, Distribution City, DC 12345</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-2xl font-bold text-gray-700">Picking Ticket</h2>
                            <p class="text-gray-600"><strong>Pick Ticket #:</strong> ${order.order_id.replace('ORD-', 'PICK-')}</p>
                            <p class="text-gray-600"><strong>Order Number:</strong> ${order.order_id}</p>
                            <p class="text-gray-600"><strong>Date:</strong> ${new Date(order.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 class="text-lg font-semibold border-b pb-2 mb-2">Sold To:</h3>
                            <p>${order.customer}</p>
                            <p>${order.address}</p>                            
                            <p>${order.customer_phone}</p>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold border-b pb-2 mb-2">Ship To:</h3>
                            <p>${order.customer}</p>
                            <p>${order.address}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-4 text-sm text-center bg-gray-100 p-2 rounded-t-lg font-semibold">
                        <div><p><strong>PO:</strong> N/A</p></div>
                        <div><p><strong>Terms:</strong> N/A</p></div>
                        <div><p><strong>Ship Via:</strong> ${order.carrier || 'N/A'}</p></div>
                        <div><p><strong>SubTotal:</strong> $${order.subtotal}</p></div>
                    </div>

                    <table class="w-full text-left border-collapse mt-4">
                        <thead>
                            <tr class="bg-gray-200">
                                <th class="p-2 border">Bin</th>
                                <th class="p-2 border">LN#</th>
                                <th class="p-2 border">SKU</th>
                                <th class="p-2 border">Description</th>
                                <th class="p-2 border text-center">Size</th>
                                <th class="p-2 border text-center">O-QTY</th>
                                <th class="p-2 border text-center">S-QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.item_list.map((item, index) => `
                                <tr class="hover:bg-gray-50">
                                    <td class="p-2 border">${item.bin}</td>
                                    <td class="p-2 border">${item.sku}</td>
                                    <td class="p-2 border">${item.item_desc}</td>
                                    <td class="p-2 border text-center">${item.item_type}</td>
                                    <td class="p-2 border text-center">${item.qty}</td>
                                    <td class="p-2 border text-center"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                     <div class="mt-8 text-center no-print">
                        <button onclick="window.print()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Print</button>
                    </div>
                </div>
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(slipContent);
            printWindow.document.close();
        }
    };

    const openOrderDetailsModal = (order: Order) => {
        setSelectedOrder(order);
        setEditingCarrier(order.carrier || '');
        setEditingTrackingNumber(order.tracking_number || '');
        setShowLabelModal(true);
    };

    const closeOrderDetailsModal = () => {
        setSelectedOrder(null);
        setShowLabelModal(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-3">
                            <PackageIcon className="h-8 w-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">Dream World Warehouse Management System</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {loading && <div className="text-sm text-blue-500 flex items-center space-x-2"><ClockIcon className="h-4 w-4 animate-spin" /><span>Syncing...</span></div>}
                            {error && <div className="text-sm text-red-500 flex items-center space-x-2"><AlertCircleIcon className="h-4 w-4" /><span>{error}</span></div>}
                            <div className="text-sm text-gray-500">Last sync: {new Date().toLocaleTimeString()}</div>
                            <button onClick={onLogout} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600">
                                <LogOutIcon className="h-4 w-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <button onClick={() => setActiveTab('inventory')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <PackageIcon className="h-5 w-5" /><span>Inventory Management</span>
                        </button>
                        <button onClick={() => setActiveTab('orders')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ShoppingCartIcon className="h-5 w-5" /><span>Order Management</span>
                        </button>
                        <button onClick={() => setActiveTab('analytics')} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <BarChart3Icon className="h-5 w-5" /><span>Analytics & Reports</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                            <h2 className="text-lg font-semibold text-gray-900">Inventory Catalog</h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input type="text" placeholder="Search description, SKU, or bin..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>
                                <select value={selectedItemType} onChange={(e) => setSelectedItemType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="all">All Item Types</option>
                                    {uniqueItemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <select value={selectedBin} onChange={(e) => setSelectedBin(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="all">All Bins</option>
                                    {uniqueBins.map(bin => <option key={bin} value={bin}>{bin}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><PackageIcon className="h-8 w-8 text-blue-600" /><div><p className="text-sm font-medium text-gray-500">Total Units</p><p className="text-2xl font-semibold text-gray-900">{getTotalInventoryItems()}</p></div></div>
                            <button onClick={() => handleStockFilter('low')} className={`p-6 rounded-lg shadow flex items-center space-x-4 text-left transition-colors ${activeStockFilters.includes('low') ? 'bg-gray-200' : 'bg-white'}`}>
                                <AlertCircleIcon className="h-8 w-8 text-orange-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                                    <p className="text-2xl font-semibold text-gray-900">{inventory.filter(i => i.qty > 0 && i.qty <= 100).length}</p>
                                </div>
                            </button>
                            <button onClick={() => handleStockFilter('out')} className={`p-6 rounded-lg shadow flex items-center space-x-4 text-left transition-colors ${activeStockFilters.includes('out') ? 'bg-gray-200' : 'bg-white'}`}>
                                <XIcon className="h-8 w-8 text-red-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                                    <p className="text-2xl font-semibold text-gray-900">{inventory.filter(i => i.qty === 0).length}</p>
                                </div>
                            </button>
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><CheckCircleIcon className="h-8 w-8 text-green-600" /><div><p className="text-sm font-medium text-gray-500">Unique SKUs</p><p className="text-2xl font-semibold text-gray-900">{getUniqueSKUs()}</p></div></div>
                        </div>
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('sku')} className="flex items-center space-x-1"><span>SKU</span>{sortConfig?.key === 'sku' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('item_desc')} className="flex items-center space-x-1"><span>Description</span>{sortConfig?.key === 'item_desc' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('item_type')} className="flex items-center space-x-1"><span>Item Type</span>{sortConfig?.key === 'item_type' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('bin')} className="flex items-center space-x-1"><span>Location (Bin)</span>{sortConfig?.key === 'bin' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('dsu')} className="flex items-center space-x-1"><span>DSU</span>{sortConfig?.key === 'dsu' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('qty')} className="flex items-center space-x-1"><span>Quantity</span>{sortConfig?.key === 'qty' && (<span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>)}</button></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredInventory.map(item => {
                                            const stockStatus = getStockStatus(item.qty);
                                            const itemKey = item.sku;
                                            return (<tr key={item.sku} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{item.sku}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.item_desc}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{item.item_type || 'N/A'}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center space-x-2 text-sm text-gray-900"><MapPinIcon className="h-4 w-4 text-gray-400" /><span>{item.bin}</span></div></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{item.dsu}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium ${getStockStatus(item.qty).bg} ${getStockStatus(item.qty).color} rounded-full`}>{item.qty} units</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.last_updated)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onClick={() => openEditItemModal(item)} className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"><Edit3Icon className="h-4 w-4" /><span>Update</span></button></td>
                                            </tr>)
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-lg font-semibold text-gray-900">Order Management</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><ShoppingCartIcon className="h-8 w-8 text-blue-600" /><div><p className="text-sm font-medium text-gray-500">Total Orders</p><p className="text-2xl font-semibold text-gray-900">{orders.length}</p></div></div>
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><ClockIcon className="h-8 w-8 text-yellow-600" /><div><p className="text-sm font-medium text-gray-500">Pending Orders</p><p className="text-2xl font-semibold text-gray-900">{orders.filter(o => o.status === 'Pending').length}</p></div></div>
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><TruckIcon className="h-8 w-8 text-green-600" /><div><p className="text-sm font-medium text-gray-500">Shipped Orders</p><p className="text-2xl font-semibold text-gray-900">{orders.filter(o => o.status === 'Shipped' || o.status === 'Delivered').length}</p></div></div>
                            <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4"><DollarSignIcon className="h-8 w-8 text-purple-600" /><div><p className="text-sm font-medium text-gray-500">Total Value</p><p className="text-2xl font-semibold text-gray-900">${getTotalOrderValue()}</p></div></div>
                        </div>
                        <div className="space-y-4">
                            {orders.map(order => {
                                const orderStatus = getOrderStatus(order);
                                const StatusIcon = orderStatus.icon;
                                return (<div key={order.order_id} className="bg-white rounded-lg shadow border">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-4">
                                                <div><h3 className="text-lg font-medium text-gray-900">{order.order_id}</h3><p className="text-sm text-gray-500">{order.customer}</p></div>
                                                <button onClick={() => openStatusUpdateModal(order)} className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${orderStatus.bg} ${orderStatus.color} hover:opacity-80 transition-opacity`} disabled={loading}><StatusIcon className="h-4 w-4" /><span className="capitalize">{order.status}</span><Edit3Icon className="h-3 w-3" /></button>
                                            </div>
                                            <div className="text-right"><p className="text-lg font-semibold text-gray-900">${order.subtotal}</p><p className="text-sm text-gray-500">{formatDateTime(order.timestamp)}</p></div>
                                        </div>
                                        <div className="mt-4 flex justify-end space-x-2">
                                            <button onClick={() => openOrderDetailsModal(order)} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"><EyeIcon className="h-4 w-4" /><span>View Details</span></button>
                                        </div>
                                    </div>
                                </div>)
                            })}
                        </div>
                    </div>
                )}
                {activeTab === 'analytics' && (
                   <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Analytics & Reports</h2>
                            <div className="flex items-center space-x-4">
                                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><DownloadIcon className="h-4 w-4" /><span>Export Report</span></button>
                            </div>
                        </div>
                        {(() => {
                            const analytics = getAnalyticsData();
                            return (<>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Total Revenue</p><p className="text-2xl font-semibold text-gray-900">${analytics.totalRevenue.toFixed(2)}</p></div><div className="flex items-center text-green-600"><TrendingUpIcon className="h-5 w-5" /></div></div>
                                    <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Avg Order Value</p><p className="text-2xl font-semibold text-gray-900">${analytics.avgOrderValue.toFixed(2)}</p></div><DollarSignIcon className="h-8 w-8 text-green-600" /></div>
                                    <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Fulfillment Rate</p><p className="text-2xl font-semibold text-gray-900">{analytics.fulfillmentRate.toFixed(1)}%</p></div><TruckIcon className="h-8 w-8 text-blue-600" /></div>
                                    <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Inventory Value</p><p className="text-2xl font-semibold text-gray-900">${analytics.totalInventoryValue.toLocaleString()}</p></div><PackageIcon className="h-8 w-8 text-purple-600" /></div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                                        <div className="h-64 flex items-end justify-between space-x-2">{analytics.dailyRevenue.map((day, index) => { const maxRevenue = Math.max(...analytics.dailyRevenue.map(d => d.revenue)); const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 200 : 0; return (<div key={index} className="flex flex-col items-center"><div className="bg-blue-500 rounded-t min-w-[20px] hover:bg-blue-600 transition-colors" style={{ height: `${height}px` }} title={`$${day.revenue.toFixed(2)}`}></div><div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">{day.date}</div></div>) })}</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
                                        <div className="space-y-4">{analytics.topProducts.map((product, index) => { const maxQty = Math.max(...analytics.topProducts.map(p => p.qty)); const percentage = maxQty > 0 ? (product.qty / maxQty) * 100 : 0; return (<div key={index} className="flex items-center space-x-3"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">{index + 1}</div><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-900">{product.name}</span><span className="text-sm text-gray-500">{product.qty} sold</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div></div></div></div>) })}</div>
                                    </div>
                                </div>
                            </>)
                        })()}
                    </div>
                )}
            </main>

            {showEditItemModal && editingItemDetails && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
                        <button onClick={closeEditItemModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Edit Item: {editingItemDetails.sku}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <input type="text" value={editingItemDetails.item_desc} onChange={(e) => handleItemDetailChange('item_desc', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Bin Location</label>
                                    <input type="text" value={editingItemDetails.bin} onChange={(e) => handleItemDetailChange('bin', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Default Selling Unit (DSU)</label>
                                    <input type="text" value={editingItemDetails.dsu} onChange={(e) => handleItemDetailChange('dsu', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Item Type</label>
                                    <input type="text" value={editingItemDetails.item_type || ''} onChange={(e) => handleItemDetailChange('item_type', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Price</label>
                                    <input 
                                        type="text" 
                                        value={typeof editingItemDetails.price === 'number' ? editingItemDetails.price.toFixed(2) : editingItemDetails.price} 
                                        onChange={handlePriceChange}
                                        onBlur={formatPriceOnBlur}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Quantity on Hand</label>
                                <div className="mt-1 flex items-center space-x-2">
                                    <input type="number" value={editingItemDetails.qty} onChange={(e) => handleItemDetailChange('qty', parseInt(e.target.value, 10))} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                    <div className="flex space-x-1">
                                        <button onClick={() => handleQtyAdjustment(-12)} className="px-2 py-1 border rounded">-12</button>
                                        <button onClick={() => handleQtyAdjustment(-6)} className="px-2 py-1 border rounded">-6</button>
                                        <button onClick={() => handleQtyAdjustment(-1)} className="px-2 py-1 border rounded">-1</button>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => handleQtyAdjustment(1)} className="px-2 py-1 border rounded">+1</button>
                                        <button onClick={() => handleQtyAdjustment(6)} className="px-2 py-1 border rounded">+6</button>
                                        <button onClick={() => handleQtyAdjustment(12)} className="px-2 py-1 border rounded">+12</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={closeEditItemModal} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSaveItemDetails} className="flex items-center space-x-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <CheckIcon className="h-5 w-5" /><span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showLabelModal && selectedOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
                        <button onClick={closeOrderDetailsModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Order Details: {selectedOrder.order_id}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div><p className="text-sm font-medium text-gray-500">Customer Name</p><p className="text-lg text-gray-900">{selectedOrder.customer}</p></div>
                            <div><p className="text-sm font-medium text-gray-500">Order Date</p><p className="text-lg text-gray-900">{formatDateTime(selectedOrder.timestamp)}</p></div>
                            <div><p className="text-sm font-medium text-gray-500">Total Value</p><p className="text-lg text-gray-900">${selectedOrder.subtotal}</p></div>
                            <div><p className="text-sm font-medium text-gray-500">Status</p><p className="text-lg text-gray-900 capitalize">{selectedOrder.status}</p></div>
                        </div>
                        <div className="mb-6"><p className="text-sm font-medium text-gray-500">Shipping Address</p><p className="text-md text-gray-900">{selectedOrder.address}</p><p className="text-sm text-gray-600">Phone: {selectedOrder.customer_phone}</p></div>
                        <div className="mb-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Carrier</label>
                                <input
                                    type="text"
                                    value={editingCarrier}
                                    onChange={(e) => setEditingCarrier(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Tracking Number</label>
                                <input
                                    type="text"
                                    value={editingTrackingNumber}
                                    onChange={(e) => setEditingTrackingNumber(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Items in Order</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto mb-6">{selectedOrder.item_list.map((item, index) => (<div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded"><div className="flex-1"><p className="text-sm font-medium text-gray-900">{item.item_desc} ({item.item_type})</p><p className="text-xs text-gray-600">SKU: {item.sku} | Qty: {item.qty}</p></div>{item.price !== undefined && (<span className="text-sm font-medium text-gray-900">${(item.qty * item.price)}</span>)}</div>))}</div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={closeOrderDetailsModal} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleUpdateTrackingDetails} className="flex items-center space-x-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <CheckIcon className="h-5 w-5" /><span>Save Changes</span>
                            </button>
                            <button onClick={() => { if (selectedOrder) printOrderSlip(selectedOrder) }} className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <PrinterIcon className="h-5 w-5" /><span>Print Order Slip</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStatusUpdateModal && orderToUpdateStatus && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 relative">
                        <button onClick={closeStatusUpdateModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Status for Order: {orderToUpdateStatus.order_id}</h2>
                        <p className="text-gray-600 mb-6">Current Status: <span className="font-semibold capitalize">{orderToUpdateStatus.status}</span></p>
                        <div className="grid grid-cols-2 gap-3">{allOrderStatuses.map(status => (<button key={status} onClick={() => handleOrderStatusChange(orderToUpdateStatus.order_id, status)} className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${status === orderToUpdateStatus.status ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>{status}</button>))}</div>
                        <div className="mt-6 flex justify-end"><button onClick={closeStatusUpdateModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WMSInterface;
