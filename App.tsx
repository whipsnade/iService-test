import React, { useState, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Card, Button, StatusBadge, UrgencyBadge } from './components/UI';
import { MapPin, Bell, AlertTriangle, Camera, PenTool, CheckCircle, ChevronRight, X, Loader2, Search, Navigation, Calculator, Fan, Lightbulb, Droplets, HelpCircle, ImagePlus, Trash2, Info, Filter, Calendar, ChevronDown, MonitorSmartphone, ShoppingBag } from 'lucide-react';
import { WorkOrder, OrderStatus, UrgencyLevel, AnalysisResult } from './types';
import { analyzeRepairImage } from './services/geminiService';

// --- HELPERS ---
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

// --- MOCK DATA ---
const NOW = new Date();
const MOCK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-9925',
    title: 'POS Connection Failure',
    location: 'Bar Area • 1F',
    status: OrderStatus.PENDING,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subDays(NOW, 0.1).toISOString(), // 2.4 hours ago
    equipmentId: 'pos',
    timeline: [{ title: 'Created', timestamp: subDays(NOW, 0.1).toISOString(), isActive: true }]
  },
  {
    id: 'WO-9920',
    title: 'Ice Machine Malfunction',
    location: 'Main Kitchen • B1',
    status: OrderStatus.PENDING_VISIT,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subDays(NOW, 1).toISOString(), // 1 day ago
    equipmentId: 'other',
    timeline: [{ title: 'Created', timestamp: subDays(NOW, 1).toISOString(), isActive: false }]
  },
  {
    id: 'WO-9918',
    title: 'HVAC Maintenance',
    location: 'Rooftop Unit 3',
    status: OrderStatus.IN_PROGRESS,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 3).toISOString(),
    equipmentId: 'hvac',
    timeline: [{ title: 'In Progress', timestamp: subDays(NOW, 3).toISOString(), isActive: true }]
  },
  {
    id: 'WO-9850',
    title: 'Lobby Light Flickering',
    location: 'Main Entrance',
    status: OrderStatus.PENDING_PAYMENT,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 15).toISOString(),
    equipmentId: 'light',
    timeline: []
  },
  {
    id: 'WO-9801',
    title: 'Bathroom Leak',
    location: 'Restroom • 2F',
    status: OrderStatus.COMPLETED,
    urgency: UrgencyLevel.CRITICAL,
    dateCreated: subDays(NOW, 45).toISOString(),
    equipmentId: 'plumbing',
    timeline: []
  },
  {
    id: 'WO-9755',
    title: 'Broken Chair',
    location: 'Dining Hall',
    status: OrderStatus.PENDING_REVIEW,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 20).toISOString(),
    equipmentId: 'other',
    timeline: []
  },
  {
    id: 'WO-9100',
    title: 'Old HVAC System',
    location: 'Basement',
    status: OrderStatus.CANCELLED,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 100).toISOString(), // > 3 months
    equipmentId: 'hvac',
    timeline: []
  }
];

const EQUIPMENT_TYPES = [
  { id: 'pos', name: 'POS Unit', icon: Calculator, issues: ['Cannot Power On', 'Network Offline', 'Printer Jammed', 'Touch Screen Fail'] },
  { id: 'hvac', name: 'HVAC/AC', icon: Fan, issues: ['Not Cooling', 'Water Leaking', 'Loud Noise', 'Bad Odor'] },
  { id: 'light', name: 'Lighting', icon: Lightbulb, issues: ['Bulb Burnt Out', 'Flickering', 'Switch Broken', 'Fixture Loose'] },
  { id: 'plumbing', name: 'Plumbing', icon: Droplets, issues: ['Tap Leaking', 'Drain Clogged', 'No Hot Water', 'Low Pressure'] },
  { id: 'other', name: 'Other', icon: HelpCircle, issues: ['General Damage', 'Cleaning Needed', 'Safety Hazard', 'Furniture Broken'] }
];

const STATUS_FILTERS = ['All', ...Object.values(OrderStatus)];
const DATE_RANGES = [
  { label: '10 Days', value: '10d', days: 10 },
  { label: '1 Month', value: '1m', days: 30 },
  { label: '3 Months', value: '3m', days: 90 },
  { label: '6 Months', value: '6m', days: 180 },
  { label: '1 Year', value: '1y', days: 365 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState<WorkOrder[]>(MOCK_ORDERS);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Skyline Plaza, NY');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  
  // Orders Filter State
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('3m'); // Default 3 months
  const [filterEquipment, setFilterEquipment] = useState('all');

  // Smart Repair State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const stats = {
    progress: orders.filter(o => o.status === OrderStatus.IN_PROGRESS).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PENDING_VISIT).length,
    completed: orders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.PENDING_REVIEW).length
  };

  // --- FILTERS MOVED TOP LEVEL ---
  const filteredOrders = useMemo(() => {
      return orders.filter(order => {
          // 1. Status Filter
          if (filterStatus !== 'All' && order.status !== filterStatus) return false;
          
          // 2. Equipment Filter
          if (filterEquipment !== 'all' && order.equipmentId !== filterEquipment) return false;

          // 3. Date Filter
          const daysLimit = DATE_RANGES.find(r => r.value === filterDate)?.days || 90;
          const cutoffDate = subDays(new Date(), daysLimit);
          const orderDate = new Date(order.dateCreated);
          if (orderDate < cutoffDate) return false;

          return true;
      }).sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()); // Sort Time Desc
  }, [orders, filterStatus, filterDate, filterEquipment]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setIsCameraOpen(true); // Open the analysis modal
        handleAnalyze(base64); // Auto start analysis
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (image: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRepairImage(image);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateOrder = (isSmart: boolean, manualData?: any) => {
    let title = "Manual Report";
    let description = "User reported issue";
    let urgency = UrgencyLevel.MEDIUM;
    let img = undefined;
    let eqId = manualData?.equipmentId;

    if (isSmart && analysisResult) {
      title = analysisResult.title;
      description = analysisResult.description;
      urgency = analysisResult.urgency;
      img = selectedImage || undefined;
      // Simple heuristic for smart mapping, in real app this comes from AI
      eqId = 'other'; 
    } else if (manualData) {
      title = manualData.title;
      description = manualData.description;
      img = manualData.image;
    }

    const newOrder: WorkOrder = {
      id: `WO-${Math.floor(Math.random() * 10000)}`,
      title: title,
      description: description,
      location: `${currentLocation} • Lobby`, 
      status: OrderStatus.PENDING,
      urgency: urgency,
      dateCreated: new Date().toISOString(),
      equipmentId: eqId,
      imageUrl: img,
      timeline: [{ title: 'Work Order Created', timestamp: new Date().toLocaleTimeString(), isActive: true }]
    };

    setOrders([newOrder, ...orders]);
    setIsCameraOpen(false);
    setIsManualOpen(false);
    setSelectedImage(null);
    setAnalysisResult(null);
    setActiveTab('orders');
    // Reset filters to see new order
    setFilterStatus('All');
    setFilterDate('3m');
  };

  const handleLocationSelect = (loc: string) => {
    setCurrentLocation(loc);
    setIsLocationPickerOpen(false);
  };

  const formatDate = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // --- Views ---

  const renderHome = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div 
          className="flex items-center gap-2 text-slate-800 cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => setIsLocationPickerOpen(true)}
        >
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
            S
          </div>
          <div>
            <h1 className="text-sm text-slate-500 font-medium flex items-center gap-1">
              Current Location <ChevronRight size={12}/>
            </h1>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <MapPin size={16} className="text-emerald-600" />
              <span>{currentLocation}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="p-2 rounded-full hover:bg-slate-100 relative">
            <Bell size={24} className="text-slate-600" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
            <img src="https://picsum.photos/100/100" alt="User" />
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <Card className="flex justify-between items-center !p-6">
        <div className="text-center flex-1 border-r border-slate-100">
          <p className="text-sm text-slate-500 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.progress}</p>
        </div>
        <div className="text-center flex-1 border-r border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-sm text-slate-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.completed}</p>
        </div>
      </Card>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setIsManualOpen(true)}
          className="h-32 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <PenTool size={24} />
          </div>
          <span className="font-semibold text-slate-700">Manual Report</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="h-32 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Camera size={24} />
          </div>
          <span className="font-semibold text-slate-700">Smart Identify</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileUpload}
        />
      </div>

      {/* Recent Activity (Preview) */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Recent Activity</h2>
        <div className="space-y-4">
          {orders.slice(0, 3).map((order) => (
            <Card key={order.id} className="relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-amber-500'}`} />
              <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-mono text-slate-400 font-medium">{order.id}</span>
                     <span className="text-xs text-slate-400">• {formatDate(order.dateCreated)}</span>
                   </div>
                   <StatusBadge status={order.status} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{order.title}</h3>
                <p className="text-sm text-slate-500">{order.location}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOrders = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
          
          {/* Sticky Header with Filters */}
          <div className="sticky top-0 z-20 bg-white shadow-sm pb-1">
              <div className="p-4 pb-2 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Work Orders</h2>
                  <div className="bg-slate-100 rounded-full p-2 text-slate-500">
                      <Search size={20} />
                  </div>
              </div>

              {/* Status Tabs (Horizontal Scroll) */}
              <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 pb-3">
                  {STATUS_FILTERS.map(status => (
                      <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              filterStatus === status 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                          {status}
                      </button>
                  ))}
              </div>

              {/* Secondary Filter Bar */}
              <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                  {/* Date Filter */}
                  <div className="relative flex items-center">
                      <Calendar size={14} className="absolute left-3 text-slate-500 pointer-events-none"/>
                      <select 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                         {DATE_RANGES.map(range => (
                             <option key={range.value} value={range.value}>{range.label}</option>
                         ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none"/>
                  </div>

                  {/* Equipment Filter */}
                  <div className="relative flex items-center">
                      <MonitorSmartphone size={14} className="absolute left-3 text-slate-500 pointer-events-none"/>
                      <select 
                        value={filterEquipment}
                        onChange={(e) => setFilterEquipment(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                         <option value="all">All Devices</option>
                         {EQUIPMENT_TYPES.map(eq => (
                             <option key={eq.id} value={eq.id}>{eq.name}</option>
                         ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none"/>
                  </div>
              </div>
          </div>

          {/* Orders List */}
          <div className="p-4 space-y-4 pb-24 overflow-y-auto no-scrollbar">
             {filteredOrders.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                     <div className="bg-slate-100 p-4 rounded-full mb-3">
                         <Filter size={32} />
                     </div>
                     <p className="text-sm font-medium">No orders found</p>
                     <p className="text-xs">Try adjusting your filters</p>
                 </div>
             ) : (
                 filteredOrders.map(order => (
                    <Card key={order.id} className="flex flex-col gap-3 group active:scale-[0.99] transition-transform duration-200">
                      <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{order.id}</span>
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{formatDate(order.dateCreated)}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 leading-tight">{order.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={10}/> {order.location}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      {order.imageUrl && (
                        <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-100">
                          <img src={order.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Issue" />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-1">
                          <div className="flex items-center gap-2">
                             <UrgencyBadge level={order.urgency} />
                             {order.equipmentId && (
                                 <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium uppercase tracking-wide">
                                     {EQUIPMENT_TYPES.find(e => e.id === order.equipmentId)?.name || 'Device'}
                                 </span>
                             )}
                          </div>
                          <Button variant="ghost" className="!p-0 !h-auto text-indigo-600 text-xs font-bold hover:bg-transparent">
                              Details <ChevronRight size={14} className="ml-0.5"/>
                          </Button>
                      </div>
                    </Card>
                 ))
             )}
             <div className="text-center text-xs text-slate-300 py-4">
                 Showing {filteredOrders.length} order{filteredOrders.length !== 1 && 's'}
             </div>
          </div>
        </div>
    );
  };

  // --- Modals ---

  const LocationPickerModal = () => {
    if (!isLocationPickerOpen) return null;
    const nearbyPlaces = ['Skyline Plaza, NY', 'Central Park, NY', 'Empire State Building', 'Times Square'];

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-sm flex justify-center">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-200">
                {/* Search Header */}
                <div className="p-4 pt-6 flex gap-3 items-center border-b border-slate-100 z-10 bg-white">
                     <button onClick={() => setIsLocationPickerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                     <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-3 h-11 transition-all focus-within:ring-2 focus-within:ring-indigo-100">
                        <Search size={18} className="text-slate-400 mr-2"/>
                        <input autoFocus placeholder="Search location" className="bg-transparent w-full outline-none text-sm text-slate-700 placeholder:text-slate-400" />
                     </div>
                </div>

                {/* Map Placeholder */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden group">
                    {/* Simulated Map Background - Dot Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1.5px,transparent_1.5px)] [background-size:20px_20px]"></div>
                    
                    {/* Simulated Map Roads/Blocks - Purely Decorative */}
                    <div className="absolute top-1/4 left-0 right-0 h-4 bg-white/40 rotate-12 transform scale-125"></div>
                    <div className="absolute top-0 bottom-0 left-1/3 w-4 bg-white/40 -rotate-6 transform scale-125"></div>

                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                             <div className="relative">
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/20 rounded-[100%] blur-[2px] animate-pulse"></span>
                                <MapPin size={48} className="relative -top-2 text-indigo-600 fill-indigo-100 drop-shadow-xl animate-bounce"/>
                             </div>
                             <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm mt-2">Move map to adjust</span>
                        </div>
                    </div>
                </div>

                {/* Nearby List */}
                <div className="bg-white rounded-t-3xl -mt-6 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] relative z-20">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Nearby Locations</h3>
                    <div className="space-y-2">
                        {nearbyPlaces.map(place => (
                            <div key={place} onClick={() => handleLocationSelect(place)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${place === currentLocation ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${place === currentLocation ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                                    <Navigation size={18} className={place === currentLocation ? "fill-current" : ""}/>
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${place === currentLocation ? 'text-indigo-700' : 'text-slate-700'}`}>{place}</p>
                                    <p className="text-xs text-slate-400">100m • Commercial</p>
                                </div>
                                {place === currentLocation && <CheckCircle size={18} className="text-indigo-600 ml-auto"/>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
  }

  const SmartRepairModal = () => {
    if (!isCameraOpen) return null;

    return (
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">Smart Identify</h3>
            <button onClick={() => { setIsCameraOpen(false); setSelectedImage(null); }} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Image Preview */}
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
            {selectedImage && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg mb-6 aspect-square bg-slate-100">
                <img src={selectedImage} alt="Analysis" className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 size={40} className="animate-spin mb-3 text-emerald-400" />
                    <p className="font-medium tracking-wide animate-pulse">Analyzing Image...</p>
                  </div>
                )}
              </div>
            )}

            {/* Analysis Result */}
            {!isAnalyzing && analysisResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                   <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                      <CheckCircle size={20} />
                   </div>
                   <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Detected Issue</p>
                      <h4 className="font-bold text-xl text-slate-800">{analysisResult.title}</h4>
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-slate-600 text-sm leading-relaxed">{analysisResult.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Category</p>
                    <p className="font-semibold text-slate-700">{analysisResult.category}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <p className="text-xs text-slate-400 mb-1">Urgency</p>
                     <UrgencyBadge level={analysisResult.urgency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
             {!isAnalyzing && analysisResult ? (
                <Button fullWidth onClick={() => handleCreateOrder(true)}>Create Ticket</Button>
             ) : (
               <Button fullWidth disabled variant="secondary">Waiting for Analysis...</Button>
             )}
          </div>
        </div>
      </div>
    );
  };

  // --- REVAMPED MANUAL FORM ---
  const ManualFormModal = () => {
    // Form Local State
    const [selectedEq, setSelectedEq] = useState<string | null>(null);
    const [selectedFault, setSelectedFault] = useState<string | null>(null);
    const [manualPhoto, setManualPhoto] = useState<string | null>(null);
    const [remarks, setRemarks] = useState('');
    const manualFileRef = useRef<HTMLInputElement>(null);

    if (!isManualOpen) return null;

    const currentEquipment = EQUIPMENT_TYPES.find(e => e.id === selectedEq);

    const handleManualSubmit = () => {
       const title = currentEquipment ? currentEquipment.name : "Maintenance Request";
       const desc = `${selectedFault ? selectedFault + '. ' : ''}${remarks}`;
       handleCreateOrder(false, { title, description: desc, image: manualPhoto, equipmentId: selectedEq });
    };

    const handleManualPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
       const file = e.target.files?.[0];
       if (file) {
         const reader = new FileReader();
         reader.onloadend = () => setManualPhoto(reader.result as string);
         reader.readAsDataURL(file);
       }
    };

    return (
       <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h3 className="font-bold text-lg text-slate-800">New Work Order</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10}/> {currentLocation}</p>
            </div>
            <button onClick={() => setIsManualOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6 bg-white">
             
             {/* Step 1: Equipment Selection */}
             <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                 <h4 className="font-semibold text-slate-800">Select Equipment</h4>
               </div>
               <p className="text-xs text-slate-500 mb-4 px-1 flex items-center gap-1"><Info size={12}/> Choose the faulty device type</p>
               
               <div className="grid grid-cols-3 gap-3">
                  {EQUIPMENT_TYPES.map(eq => {
                    const Icon = eq.icon;
                    const isSelected = selectedEq === eq.id;
                    return (
                      <button 
                        key={eq.id}
                        onClick={() => { setSelectedEq(eq.id); setSelectedFault(null); }}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500'}`}
                      >
                        <Icon size={24} className={isSelected ? 'text-indigo-600' : 'text-current'} strokeWidth={1.5} />
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>{eq.name}</span>
                      </button>
                    )
                  })}
               </div>
             </div>

             {/* Step 2: Fault Description */}
             <div className={`bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-opacity duration-300 ${!selectedEq ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h4 className="font-semibold text-slate-800">Issue Description</h4>
                </div>
                
                {selectedEq && currentEquipment ? (
                  <div className="mb-4">
                     <p className="text-xs text-slate-500 mb-2 px-1">Common issues for {currentEquipment.name}:</p>
                     <div className="flex flex-wrap gap-2">
                        {currentEquipment.issues.map(issue => (
                          <button
                            key={issue}
                            onClick={() => setSelectedFault(issue === selectedFault ? null : issue)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedFault === issue ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                          >
                            {issue}
                          </button>
                        ))}
                     </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-4 px-1">Please select equipment first...</p>
                )}

                <label className="block text-xs font-bold text-slate-700 mb-1.5 px-1 uppercase tracking-wider">Remarks / Details</label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]" 
                  placeholder="e.g. Error code 503 displayed on screen..."
                />
             </div>

             {/* Step 3: Evidence */}
             <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                 <h4 className="font-semibold text-slate-800">Photo Evidence</h4>
               </div>
               
               {!manualPhoto ? (
                 <div 
                    onClick={() => manualFileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all"
                 >
                    <ImagePlus size={32} strokeWidth={1.5} className="mb-2"/>
                    <span className="text-xs font-medium">Tap to upload photo</span>
                 </div>
               ) : (
                 <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
                    <img src={manualPhoto} alt="Evidence" className="w-full h-40 object-cover" />
                    <button 
                      onClick={() => setManualPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
               )}
               <input type="file" ref={manualFileRef} className="hidden" accept="image/*" onChange={handleManualPhotoUpload}/>
             </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-white pb-6 sm:pb-4">
             <Button fullWidth onClick={handleManualSubmit} disabled={!selectedEq}>
               Submit Work Order
             </Button>
          </div>

        </div>
       </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onScanClick={() => fileInputRef.current?.click()}
    >
      {activeTab === 'home' && renderHome()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'mall' && (
         <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300">
               <ShoppingBag size={32} />
            </div>
            <p className="font-medium">Store Coming Soon</p>
         </div>
      )}
      {activeTab === 'settings' && (
        <div className="flex items-center justify-center h-full text-slate-400">Settings Placeholder</div>
      )}
      
      <SmartRepairModal />
      <ManualFormModal />
      <LocationPickerModal />
    </Layout>
  );
};

export default App;