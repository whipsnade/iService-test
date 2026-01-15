import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Card, Button, StatusBadge, UrgencyBadge } from './components/UI';
import { MapPin, Bell, AlertTriangle, Camera, PenTool, CheckCircle, ChevronRight, X, Loader2, Search, Navigation, Calculator, Fan, Lightbulb, Droplets, HelpCircle, ImagePlus, Trash2, Info, Filter, Calendar, ChevronDown, MonitorSmartphone, Headphones, ChevronLeft, Phone, User, Clock, Map as MapIcon, CreditCard, Wallet, Edit3, Mic, Square, Sparkles, Mail, MailOpen, FileText, Settings as SettingsIcon, ChevronUp, Bot, Send } from 'lucide-react';
import { WorkOrder, OrderStatus, UrgencyLevel, AnalysisResult } from './types';
import { analyzeRepairImage, analyzeRepairAudio } from './services/geminiService';

// --- HELPERS ---
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
const subMinutes = (date: Date, minutes: number) => new Date(date.getTime() - minutes * 60000);

// --- MOCK DATA ---
const NOW = new Date();

const MOCK_ENGINEER = {
  id: 'ENG-001',
  name: '王师傅',
  phone: '138-0000-0000',
  rating: 4.8,
  latitude: 40.7128,
  longitude: -74.0060,
  distance: '1.2km',
  avatarUrl: 'https://i.pravatar.cc/150?u=eng1'
};

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: '工程师已指派',
    message: '王师傅 已接单（工单号 WO-9920）。他将在约30分钟后到达。',
    type: 'order',
    isRead: false,
    timestamp: subMinutes(NOW, 30).toISOString()
  },
  {
    id: '2',
    title: '系统维护通知',
    message: '计划于今晚凌晨2点至4点进行服务器维护，服务可能会间歇性中断。',
    type: 'system',
    isRead: false,
    timestamp: subDays(NOW, 0.5).toISOString()
  },
   {
    id: '3',
    title: '支付成功',
    message: '工单 WO-9850 的付款已成功处理。',
    type: 'payment',
    isRead: true,
    timestamp: subDays(NOW, 2).toISOString()
  },
  {
    id: '4',
    title: '工单已完成',
    message: '工程师已标记工单 WO-9801（卫生间漏水）为已完成。',
    type: 'order',
    isRead: true,
    timestamp: subDays(NOW, 45).toISOString()
  }
];

const MOCK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-9925',
    title: 'POS机连接失败',
    location: '吧台区域 • 1楼',
    status: OrderStatus.PENDING,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subMinutes(NOW, 10).toISOString(), // 10 mins ago (Free cancel window)
    equipmentId: 'pos',
    timeline: [{ title: '工单已创建', timestamp: subMinutes(NOW, 10).toISOString(), isActive: true }],
    description: "屏幕冻结，触摸无反应。",
    remarks: "请从侧门进入。"
  },
  {
    id: 'WO-9920',
    title: '制冰机故障',
    location: '主厨房 • B1层',
    status: OrderStatus.PENDING_VISIT,
    urgency: UrgencyLevel.HIGH,
    dateCreated: subDays(NOW, 0.1).toISOString(), // 2.4 hours ago
    equipmentId: 'other',
    timeline: [
      { title: '工单已创建', timestamp: subDays(NOW, 0.1).toISOString(), isActive: false },
      { title: '工程师已指派', timestamp: subMinutes(NOW, 30).toISOString(), isActive: true }
    ],
    engineer: MOCK_ENGINEER,
    description: "发出巨大的研磨声，且不制冰。",
    remarks: "门禁密码是 1234"
  },
  {
    id: 'WO-9918',
    title: '空调系统维护',
    location: '屋顶机组 3号',
    status: OrderStatus.IN_PROGRESS,
    urgency: UrgencyLevel.MEDIUM,
    dateCreated: subDays(NOW, 3).toISOString(),
    equipmentId: 'hvac',
    timeline: [
      { title: '工单已创建', timestamp: subDays(NOW, 3).toISOString(), isActive: false },
      { title: '工程师已到达', timestamp: subDays(NOW, 3).toISOString(), isActive: false },
      { title: '诊断完成', timestamp: subDays(NOW, 3).toISOString(), isActive: true }
    ],
    engineer: MOCK_ENGINEER,
    description: "定期维护检查。"
  },
  {
    id: 'WO-9850',
    title: '大堂灯光闪烁',
    location: '主入口',
    status: OrderStatus.PENDING_PAYMENT,
    urgency: UrgencyLevel.LOW,
    dateCreated: subDays(NOW, 15).toISOString(),
    equipmentId: 'light',
    timeline: [
      { title: '工单已创建', timestamp: subDays(NOW, 15).toISOString(), isActive: false },
      { title: '维修完成', timestamp: subDays(NOW, 15).toISOString(), isActive: true }
    ],
    engineer: MOCK_ENGINEER,
    cost: 120.00,
    description: "灯泡间歇性闪烁。"
  },
  {
    id: 'WO-9801',
    title: '卫生间漏水',
    location: '洗手间 • 2楼',
    status: OrderStatus.COMPLETED,
    urgency: UrgencyLevel.CRITICAL,
    dateCreated: subDays(NOW, 45).toISOString(),
    equipmentId: 'plumbing',
    timeline: [],
    engineer: MOCK_ENGINEER,
    cost: 250.00
  },
];

const EQUIPMENT_TYPES = [
  { id: 'pos', name: 'POS终端', icon: Calculator, issues: ['无法开机', '网络离线', '打印机卡纸', '触摸屏失灵'] },
  { id: 'hvac', name: '空调暖通', icon: Fan, issues: ['不制冷/热', '漏水', '噪音大', '异味'] },
  { id: 'light', name: '照明灯具', icon: Lightbulb, issues: ['灯泡烧坏', '闪烁', '开关损坏', '灯具松动'] },
  { id: 'plumbing', name: '管道水路', icon: Droplets, issues: ['水龙头漏水', '下水道堵塞', '无热水', '水压低'] },
  { id: 'other', name: '其他杂项', icon: HelpCircle, issues: ['一般损坏', '需要清洁', '安全隐患', '家具破损'] }
];

const STATUS_FILTERS = ['全部', ...Object.values(OrderStatus)];
const DATE_RANGES = [
  { label: '近10天', value: '10d', days: 10 },
  { label: '近1个月', value: '1m', days: 30 },
  { label: '近3个月', value: '3m', days: 90 },
  { label: '近半年', value: '6m', days: 180 },
  { label: '近1年', value: '1y', days: 365 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState<WorkOrder[]>(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('上海中心大厦, 上海');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  
  // Detail View States
  const [isEditRemarksOpen, setIsEditRemarksOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editRemarksValue, setEditRemarksValue] = useState('');
  
  // Orders Filter State
  const [filterStatus, setFilterStatus] = useState('全部');
  const [filterDate, setFilterDate] = useState('3m'); // Default 3 months
  const [filterEquipment, setFilterEquipment] = useState('all');

  // Smart Repair State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{id: string, text?: string, sender: 'user' | 'agent', order?: WorkOrder}[]>([
      { id: '1', text: "您好！我是您的智能客服助手。您可以在下方选择工单进行反馈，或直接向我提问。", sender: 'agent' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'support') {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Stats
  const stats = {
    progress: orders.filter(o => o.status === OrderStatus.IN_PROGRESS).length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PENDING_VISIT).length,
    completed: orders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.PENDING_REVIEW).length
  };

  // --- FILTERS ---
  const filteredOrders = useMemo(() => {
      return orders.filter(order => {
          // 1. Status Filter
          if (filterStatus !== '全部') {
            if (filterStatus === 'pending_group') {
              // Grouped Pending (Pending Acceptance + Pending Visit)
              if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PENDING_VISIT) return false;
            } else if (filterStatus === 'completed_group') {
              // Grouped Completed (Completed + Pending Review)
              if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.PENDING_REVIEW) return false;
            } else {
              // Exact Match
              if (order.status !== filterStatus) return false;
            }
          }
          
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

  const handleStatClick = (group: 'progress' | 'pending' | 'completed') => {
    setActiveTab('orders');
    setSelectedOrder(null);
    if (group === 'progress') setFilterStatus(OrderStatus.IN_PROGRESS);
    if (group === 'pending') setFilterStatus('pending_group');
    if (group === 'completed') setFilterStatus('completed_group');
  };

  const toggleOrderExpansion = (id: string) => {
    const newSet = new Set(expandedOrderIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setExpandedOrderIds(newSet);
  };

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
    let title = "手动报修";
    let description = "用户报告的问题";
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
      eqId = manualData.equipmentId;
    }

    const newOrder: WorkOrder = {
      id: `WO-${Math.floor(Math.random() * 10000)}`,
      title: title,
      description: description,
      location: `${currentLocation} • 大堂`, 
      status: OrderStatus.PENDING,
      urgency: urgency,
      dateCreated: new Date().toISOString(),
      equipmentId: eqId,
      imageUrl: img,
      timeline: [{ title: '工单已创建', timestamp: new Date().toLocaleTimeString(), isActive: true }]
    };

    setOrders([newOrder, ...orders]);
    setIsCameraOpen(false);
    setIsVoiceOpen(false);
    setIsManualOpen(false);
    setSelectedImage(null);
    setAnalysisResult(null);
    setActiveTab('orders');
    // Reset filters to see new order
    setFilterStatus('全部');
    setFilterDate('3m');
  };

  const handleLocationSelect = (loc: string) => {
    setCurrentLocation(loc);
    setIsLocationPickerOpen(false);
  };

  const handleOrderClick = (order: WorkOrder) => {
    setSelectedOrder(order);
    setActiveTab('orders'); // Ensure we are in the orders tab structure
  };

  const handleUpdateRemarks = () => {
    if (selectedOrder) {
      const updatedOrder = { ...selectedOrder, remarks: editRemarksValue };
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsEditRemarksOpen(false);
    }
  };

  const handleCancelOrder = () => {
    if (!selectedOrder) return;
    const now = new Date();
    const created = new Date(selectedOrder.dateCreated);
    const diffMins = (now.getTime() - created.getTime()) / 60000;
    
    let message = "您确定要取消吗？";
    if (diffMins > 15) {
      message = "15分钟后取消将收取上门费。是否继续？";
    } else {
      message = "15分钟内可免费取消。是否现在取消？";
    }

    if (window.confirm(message)) {
      const updated = { ...selectedOrder, status: OrderStatus.CANCELLED };
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
      setSelectedOrder(updated);
    }
  };

  const handlePayment = () => {
    if (!selectedOrder) return;
    // Simulate payment processing
    setTimeout(() => {
       const updated = { ...selectedOrder, status: OrderStatus.COMPLETED, timeline: [...selectedOrder.timeline, { title: '支付确认', timestamp: new Date().toISOString(), isActive: true }] };
       setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
       setSelectedOrder(updated);
       setIsPaymentOpen(false);
       alert("支付成功！");
    }, 1500);
  };

  // Chat Handlers
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = { id: Date.now().toString(), text: chatInput, sender: 'user' as const };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput("");
    
    // Fake reply
    setTimeout(() => {
        setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: "我已收到您的消息，稍后将有客服与您联系。", sender: 'agent' }]);
    }, 1000);
  };

  const handleSendOrder = (order: WorkOrder) => {
    const newMsg = { 
        id: Date.now().toString(), 
        text: `我对这个工单有问题: ${order.title}`, 
        sender: 'user' as const,
        order: order
    };
    setChatMessages(prev => [...prev, newMsg]);

    // Fake reply
    setTimeout(() => {
        setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: `正在为您查询 ${order.id} 的状态... 当前状态为：${order.status}。`, sender: 'agent' }]);
    }, 1000);
  }

  const formatDate = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
              当前位置 <ChevronRight size={12}/>
            </h1>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <MapPin size={16} className="text-emerald-600" />
              <span>{currentLocation}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            className="p-2 rounded-full hover:bg-slate-100 relative"
            onClick={() => setIsNotificationsOpen(true)}
          >
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
        <div 
          onClick={() => handleStatClick('progress')}
          className="text-center flex-1 border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">进行中</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.progress}</p>
        </div>
        <div 
          onClick={() => handleStatClick('pending')}
          className="text-center flex-1 border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">待处理</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
        <div 
          onClick={() => handleStatClick('completed')}
          className="text-center flex-1 cursor-pointer hover:bg-slate-50 transition-colors py-2 -my-2 rounded-lg"
        >
          <p className="text-sm text-slate-500 mb-1">已完成</p>
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
          <span className="font-semibold text-slate-700">手动报修</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="h-32 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Camera size={24} />
          </div>
          <span className="font-semibold text-slate-700">智能识别</span>
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
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">最近动态</h2>
        <div className="space-y-4">
          {orders.slice(0, 3).map((order) => {
            const isExpanded = expandedOrderIds.has(order.id);
            const isCompleted = order.status === OrderStatus.COMPLETED;
            
            // Construct full lifecycle steps for the expanded view
            const progressSteps = [
                { title: '工单已创建', active: true, time: order.dateCreated },
                { title: '工程师已指派', active: !!order.engineer, time: order.engineer ? subMinutes(new Date(), 45).toISOString() : null },
                { title: '诊断/维修', active: order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待支付', active: order.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '已完成', active: isCompleted, time: null }
            ];

            return (
              <Card 
                key={order.id} 
                className="relative overflow-hidden group transition-all duration-300 ease-in-out cursor-pointer" 
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-amber-500'}`} />
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-mono text-slate-400 font-medium">{order.id}</span>
                       <span className="text-xs text-slate-400">• {formatDate(order.dateCreated)}</span>
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}
                       className="transform active:scale-95 transition-transform"
                     >
                        <StatusBadge status={order.status} />
                     </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{order.title}</h3>
                        <p className="text-sm text-slate-500">{order.location}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-300"/> : <ChevronDown size={20} className="text-slate-300"/>}
                  </div>
                  
                  {/* Expanded Timeline */}
                  {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 origin-top">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">工单进度</h4>
                          <div className="space-y-4 pl-2 relative before:absolute before:left-[5px] before:top-1.5 before:bottom-1 before:w-[2px] before:bg-slate-100">
                                {progressSteps.map((step, idx) => (
                                     <div key={idx} className="relative flex items-start gap-3 z-10">
                                        <div className={`w-3 h-3 rounded-full border-2 mt-0.5 shrink-0 transition-colors duration-300 ${step.active ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}></div>
                                        <div>
                                            <p className={`text-xs font-semibold leading-none mb-1 ${step.active ? 'text-slate-700' : 'text-slate-400'}`}>{step.title}</p>
                                            {step.time && <p className="text-[10px] text-slate-400">{formatDate(step.time)}</p>}
                                        </div>
                                     </div>
                                ))}
                          </div>
                      </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => {
    if (!isNotificationsOpen) return null;

    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-white p-4 pt-12 sm:pt-4 border-b border-slate-100 flex items-center gap-3 shadow-sm sticky top-0">
           <button onClick={() => setIsNotificationsOpen(false)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600"/>
           </button>
           <h2 className="font-bold text-lg text-slate-800">消息通知</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
           {MOCK_NOTIFICATIONS.map(n => (
              <div key={n.id} className={`p-4 rounded-2xl border flex gap-4 transition-all active:scale-[0.99] ${n.isRead ? 'bg-white border-slate-100' : 'bg-white border-indigo-100 shadow-[0_4px_20px_rgba(79,70,229,0.05)] relative overflow-hidden'}`}>
                  {/* Unread Indicator Line */}
                  {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      {/* Icon logic based on notification type */}
                      {n.type === 'order' ? (
                          n.isRead ? <FileText size={20}/> : <FileText size={20} className="fill-current"/>
                      ) : n.type === 'system' ? (
                          n.isRead ? <SettingsIcon size={20}/> : <SettingsIcon size={20} className="fill-current"/>
                      ) : (
                          n.isRead ? <MailOpen size={20}/> : <Mail size={20} className="fill-current"/>
                      )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm truncate pr-2 ${n.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(n.timestamp)}</span>
                     </div>
                     <p className={`text-xs leading-relaxed line-clamp-2 ${n.isRead ? 'text-slate-500' : 'text-slate-600'}`}>{n.message}</p>
                  </div>
                  
                  {!n.isRead && <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></div>}
              </div>
           ))}
           <div className="text-center pt-4">
               <p className="text-xs text-slate-400">没有更多通知了</p>
           </div>
        </div>
      </div>
    )
  }

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;

    const canCancel = selectedOrder.status === OrderStatus.PENDING || selectedOrder.status === OrderStatus.PENDING_VISIT;
    const isPayable = selectedOrder.status === OrderStatus.PENDING_PAYMENT;
    const isCompleted = selectedOrder.status === OrderStatus.COMPLETED;

    return (
      <div className="min-h-full bg-slate-50 pb-24 relative">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center gap-3">
          <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} className="text-slate-700"/>
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-slate-800 text-lg">工单详情</h2>
            <p className="text-xs text-slate-500 font-mono">{selectedOrder.id}</p>
          </div>
          <StatusBadge status={selectedOrder.status} />
        </div>

        <div className="p-4 space-y-4">
          
          {/* Map / Engineer Location */}
          <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white relative h-48 group">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
               <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                 {selectedOrder.engineer ? (
                   <img src={selectedOrder.engineer.avatarUrl} alt="Eng" className="w-10 h-10 rounded-full object-cover"/>
                 ) : (
                   <User size={24} className="text-slate-400"/>
                 )}
               </div>
            </div>
            {/* Simulated Path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
              <path d="M50,150 Q150,50 300,100" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="5,5"/>
            </svg>
            
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-sm border border-slate-100 flex justify-between items-center">
              {selectedOrder.engineer ? (
                <>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">工程师位置</p>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      <MapIcon size={14} className="text-emerald-500"/> 距离 {selectedOrder.engineer.distance}
                    </p>
                  </div>
                  <a href={`tel:${selectedOrder.engineer.phone}`} className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <Phone size={18} />
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 w-full justify-center py-1">
                   <Clock size={16} className="animate-spin-slow"/>
                   <span className="text-sm font-medium">等待工程师接单...</span>
                </div>
              )}
            </div>
          </div>

          {/* Core Details */}
          <Card className="space-y-4">
             <div className="flex items-start gap-3">
               <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                  <MonitorSmartphone size={24}/>
               </div>
               <div>
                 <h3 className="font-bold text-slate-800">{selectedOrder.title}</h3>
                 <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedOrder.description || "无详细描述。"}</p>
                 <div className="flex gap-2 mt-2">
                    <UrgencyBadge level={selectedOrder.urgency} />
                    {selectedOrder.equipmentId && (
                       <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                          {EQUIPMENT_TYPES.find(e => e.id === selectedOrder.equipmentId)?.name || '设备'}
                       </span>
                    )}
                 </div>
               </div>
             </div>

             {selectedOrder.imageUrl && (
               <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                 <img src={selectedOrder.imageUrl} className="w-full h-full object-cover" alt="Fault"/>
               </div>
             )}

             <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">备注</span>
                   <button 
                     onClick={() => { setEditRemarksValue(selectedOrder.remarks || ''); setIsEditRemarksOpen(true); }}
                     className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded"
                   >
                     <Edit3 size={12}/> 编辑
                   </button>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 border border-slate-100">
                  {selectedOrder.remarks || <span className="text-slate-400 italic">无额外备注。</span>}
                </div>
             </div>
          </Card>

          {/* Timeline */}
          <Card>
            <h3 className="font-bold text-slate-800 mb-4 text-sm">工单进度</h3>
            <div className="relative pl-2 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              {/* Combine static timeline with dynamic states for demo */}
              {[
                { title: '工单已创建', active: true, time: selectedOrder.dateCreated },
                { title: '工程师已指派', active: !!selectedOrder.engineer, time: selectedOrder.engineer ? subMinutes(new Date(), 45).toISOString() : null },
                { title: '诊断/维修', active: selectedOrder.status === OrderStatus.IN_PROGRESS || selectedOrder.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '待支付', active: selectedOrder.status === OrderStatus.PENDING_PAYMENT || isCompleted, time: null },
                { title: '已完成', active: isCompleted, time: null }
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-3 z-10">
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${step.active ? 'border-emerald-500 text-emerald-500' : 'border-slate-200 text-slate-300'}`}>
                      {step.active && <div className="w-2 h-2 bg-emerald-500 rounded-full"/>}
                   </div>
                   <div className="-mt-1">
                      <p className={`text-sm font-semibold ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                      {step.time && <p className="text-[10px] text-slate-400">{formatDate(step.time)}</p>}
                   </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-slate-100 z-40 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           {canCancel && (
             <Button variant="secondary" className="flex-1 border-red-100 text-red-600 hover:bg-red-50" onClick={handleCancelOrder}>
               取消工单
             </Button>
           )}
           
           {isPayable && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" onClick={() => setIsPaymentOpen(true)}>
                确认并支付
              </Button>
           )}

           {!canCancel && !isPayable && !isCompleted && (
              <Button variant="ghost" className="flex-1 cursor-default opacity-50 bg-slate-100">
                 进行中
              </Button>
           )}

           {isCompleted && (
              <Button variant="outline" className="flex-1 border-emerald-500 text-emerald-600" disabled>
                 已完成
              </Button>
           )}
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    // If an order is selected, show details instead of list
    if (selectedOrder) {
      return renderOrderDetail();
    }

    const isTabActive = (status: string) => {
      if (filterStatus === status) return true;
      if (filterStatus === 'pending_group' && (status === OrderStatus.PENDING || status === OrderStatus.PENDING_VISIT)) return true;
      if (filterStatus === 'completed_group' && (status === OrderStatus.COMPLETED || status === OrderStatus.PENDING_REVIEW)) return true;
      return false;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
          
          {/* Sticky Header with Filters */}
          <div className="sticky top-0 z-20 bg-white shadow-sm pb-1">
              <div className="p-4 pb-2 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">我的工单</h2>
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
                              isTabActive(status) 
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
                         <option value="all">所有设备</option>
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
                     <p className="text-sm font-medium">未找到工单</p>
                     <p className="text-xs">请尝试调整筛选条件</p>
                 </div>
             ) : (
                 filteredOrders.map(order => (
                    <Card key={order.id} onClick={() => handleOrderClick(order)} className="flex flex-col gap-3 group active:scale-[0.99] transition-transform duration-200 cursor-pointer hover:shadow-md">
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
                                     {EQUIPMENT_TYPES.find(e => e.id === order.equipmentId)?.name || '设备'}
                                 </span>
                             )}
                          </div>
                          <Button variant="ghost" className="!p-0 !h-auto text-indigo-600 text-xs font-bold hover:bg-transparent">
                              详情 <ChevronRight size={14} className="ml-0.5"/>
                          </Button>
                      </div>
                    </Card>
                 ))
             )}
             <div className="text-center text-xs text-slate-300 py-4">
                 显示 {filteredOrders.length} 个工单
             </div>
          </div>
        </div>
    );
  };

  const renderSupport = () => {
    const ongoingOrders = orders.filter(o => 
        o.status !== OrderStatus.COMPLETED && 
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.REFUNDING
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
             {/* Header */}
             <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg text-slate-800">在线客服</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> 在线
                    </p>
                </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
                {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] space-y-2`}>
                            {msg.text && (
                                <div className={`p-3 rounded-2xl text-sm ${
                                    msg.sender === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200' 
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            )}
                            {msg.order && (
                                <div className={`p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-left overflow-hidden ${msg.sender === 'user' ? 'ml-auto' : ''}`}>
                                     <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded">{msg.order.id}</span>
                                        <StatusBadge status={msg.order.status} />
                                     </div>
                                     <p className="font-bold text-slate-800 text-sm">{msg.order.title}</p>
                                     <p className="text-xs text-slate-500 mt-0.5">{msg.order.location}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
             </div>

             {/* Bottom Area - Order List & Input */}
             {/* We need to be careful with z-index and spacing because of Layout's floating nav */}
             <div className="bg-white border-t border-slate-100 z-20 pb-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                
                {/* Ongoing Orders List */}
                {ongoingOrders.length > 0 && (
                    <div className="border-b border-slate-100 bg-slate-50/50">
                        <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                            <span>进行中的工单</span>
                            <span className="bg-slate-200 text-slate-500 px-1.5 rounded-full text-[10px]">{ongoingOrders.length}</span>
                        </div>
                        <div className="flex overflow-x-auto gap-3 px-4 pb-3 no-scrollbar snap-x">
                            {ongoingOrders.map(order => (
                                <button 
                                    key={order.id} 
                                    onClick={() => handleSendOrder(order)}
                                    className="snap-start shrink-0 w-48 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-start gap-1 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                                >
                                    <div className="flex justify-between w-full mb-1">
                                        <span className="text-[10px] font-mono text-slate-400">{order.id}</span>
                                        <div className={`w-2 h-2 rounded-full ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                    </div>
                                    <p className="font-bold text-slate-700 text-xs truncate w-full group-hover:text-indigo-700">{order.title}</p>
                                    <p className="text-[10px] text-slate-500 truncate w-full">{order.location}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Field */}
                <div className="p-3 flex gap-2 items-center">
                    <input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="输入消息..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        <Send size={18} className="ml-0.5" />
                    </button>
                </div>
             </div>
        </div>
    )
  }

  // --- Modals ---

  const EditRemarksModal = () => {
    if (!isEditRemarksOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-4 text-slate-800">编辑备注</h3>
            <textarea 
              value={editRemarksValue}
              onChange={(e) => setEditRemarksValue(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
              placeholder="请输入给工程师的备注信息..."
            />
            <div className="flex gap-3 mt-4">
               <Button variant="secondary" className="flex-1" onClick={() => setIsEditRemarksOpen(false)}>取消</Button>
               <Button className="flex-1" onClick={handleUpdateRemarks}>保存</Button>
            </div>
         </div>
      </div>
    )
  }

  const PaymentModal = () => {
    if (!isPaymentOpen || !selectedOrder) return null;
    const amount = selectedOrder.cost || 100.00;
    
    return (
       <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-20 duration-300">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">支付详情</h3>
                <button onClick={() => setIsPaymentOpen(false)}><X size={20} className="text-slate-400"/></button>
             </div>
             
             <div className="text-center mb-8">
                <p className="text-slate-500 text-sm mb-1">总金额</p>
                <h2 className="text-4xl font-bold text-slate-800">¥{amount.toFixed(2)}</h2>
             </div>

             <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-4 border border-indigo-100 bg-indigo-50 rounded-xl cursor-pointer">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                      <CreditCard size={20}/>
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">信用卡</p>
                      <p className="text-xs text-slate-500">**** 4242</p>
                   </div>
                   <div className="w-5 h-5 rounded-full border-4 border-indigo-600"></div>
                </div>
                <div className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl cursor-pointer opacity-60">
                   <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <Wallet size={20}/>
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">微信支付</p>
                   </div>
                   <div className="w-5 h-5 rounded-full border border-slate-300"></div>
                </div>
             </div>

             <Button fullWidth onClick={handlePayment} className="py-4 text-lg shadow-xl shadow-emerald-100 bg-emerald-600 hover:bg-emerald-700">
                支付 ¥{amount.toFixed(2)}
             </Button>
          </div>
       </div>
    );
  }

  const LocationPickerModal = () => {
    if (!isLocationPickerOpen) return null;
    const nearbyPlaces = ['上海中心大厦, 上海', '人民广场, 上海', '陆家嘴金融中心', '南京西路'];

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-sm flex justify-center">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-200">
                {/* Search Header */}
                <div className="p-4 pt-6 flex gap-3 items-center border-b border-slate-100 z-10 bg-white">
                     <button onClick={() => setIsLocationPickerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                     <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-3 h-11 transition-all focus-within:ring-2 focus-within:ring-indigo-100">
                        <Search size={18} className="text-slate-400 mr-2"/>
                        <input autoFocus placeholder="搜索位置" className="bg-transparent w-full outline-none text-sm text-slate-700 placeholder:text-slate-400" />
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
                             <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm mt-2">移动地图以定位</span>
                        </div>
                    </div>
                </div>

                {/* Nearby List */}
                <div className="bg-white rounded-t-3xl -mt-6 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] relative z-20">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">附近位置</h3>
                    <div className="space-y-2">
                        {nearbyPlaces.map(place => (
                            <div key={place} onClick={() => handleLocationSelect(place)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${place === currentLocation ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${place === currentLocation ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                                    <Navigation size={18} className={place === currentLocation ? "fill-current" : ""}/>
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${place === currentLocation ? 'text-indigo-700' : 'text-slate-700'}`}>{place}</p>
                                    <p className="text-xs text-slate-400">100米 • 商业区</p>
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
            <h3 className="font-bold text-lg">智能识别</h3>
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
                    <p className="font-medium tracking-wide animate-pulse">正在分析图片...</p>
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
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">检测到的问题</p>
                      <h4 className="font-bold text-xl text-slate-800">{analysisResult.title}</h4>
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-slate-600 text-sm leading-relaxed">{analysisResult.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">类别</p>
                    <p className="font-semibold text-slate-700">{analysisResult.category}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <p className="text-xs text-slate-400 mb-1">紧急程度</p>
                     <UrgencyBadge level={analysisResult.urgency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
             {!isAnalyzing && analysisResult ? (
                <Button fullWidth onClick={() => handleCreateOrder(true)}>创建工单</Button>
             ) : (
               <Button fullWidth disabled variant="secondary">等待分析...</Button>
             )}
          </div>
        </div>
      </div>
    );
  };

  const VoiceRepairModal = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    if (!isVoiceOpen) return null;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
             const base64Audio = reader.result as string;
             setIsAnalyzing(true);
             const result = await analyzeRepairAudio(base64Audio);
             setAnalysisResult(result);
             setIsAnalyzing(false);
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access denied or not available.");
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        // Stop all tracks to release mic
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };

    const toggleRecording = () => {
      if (isRecording) stopRecording();
      else startRecording();
    }

    // Reset when closing
    const handleClose = () => {
      setIsVoiceOpen(false);
      setAnalysisResult(null);
      setIsAnalyzing(false);
      setIsRecording(false);
      if(mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
    }

    return (
       <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
         <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
           
           {/* Header */}
           <div className="p-5 flex justify-between items-center border-b border-slate-50">
             <div>
                <h3 className="font-bold text-xl text-slate-800">语音报修</h3>
                <p className="text-xs text-slate-400">请清晰描述问题</p>
             </div>
             <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400"/></button>
           </div>

           {/* Content */}
           <div className="p-6 flex flex-col items-center justify-center flex-1 min-h-[300px]">
              
              {!isAnalyzing && !analysisResult && (
                <>
                  <div className="relative mb-8">
                     {isRecording && (
                       <>
                         <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                         <div className="absolute inset-[-12px] bg-red-500 rounded-full animate-pulse opacity-10"></div>
                       </>
                     )}
                     <button 
                       onClick={toggleRecording}
                       className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isRecording ? 'bg-red-500 text-white scale-110' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
                     >
                        {isRecording ? <Square size={32} fill="currentColor"/> : <Mic size={40} />}
                     </button>
                  </div>

                  <h4 className="font-bold text-slate-800 text-lg mb-2">
                    {isRecording ? "正在聆听..." : "点击开始录音"}
                  </h4>
                  <p className="text-sm text-slate-500 text-center max-w-[240px] mb-8">
                    {isRecording ? "请清晰描述问题。再次点击结束录音。" : "请描述故障的位置和类型。"}
                  </p>

                  {/* Examples */}
                  <div className="w-full space-y-3">
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 opacity-80">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm"><Sparkles size={14}/></div>
                        <p className="text-xs text-slate-600">"大堂的空调正在漏水"</p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 opacity-80">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm"><Sparkles size={14}/></div>
                        <p className="text-xs text-slate-600">"B区电梯按钮失灵"</p>
                     </div>
                  </div>
                </>
              )}

              {isAnalyzing && (
                 <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="font-bold text-slate-800">正在分析音频...</p>
                    <p className="text-xs text-slate-400 mt-1">正在识别问题详情</p>
                 </div>
              )}

              {/* Result View */}
              {!isAnalyzing && analysisResult && (
                 <div className="w-full animate-in slide-in-from-bottom-5">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6 flex items-start gap-3">
                       <CheckCircle size={24} className="text-emerald-600 mt-0.5 shrink-0"/>
                       <div>
                          <p className="text-xs font-bold text-emerald-600 uppercase mb-0.5">识别到的问题</p>
                          <h4 className="font-bold text-slate-800">{analysisResult.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{analysisResult.description}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <p className="text-[10px] text-slate-400 font-bold uppercase">类别</p>
                           <p className="font-semibold text-slate-700">{analysisResult.category}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <p className="text-[10px] text-slate-400 font-bold uppercase">紧急程度</p>
                           <UrgencyBadge level={analysisResult.urgency} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                       <Button variant="secondary" onClick={() => setAnalysisResult(null)} className="flex-1">重试</Button>
                       <Button className="flex-[2]" onClick={() => handleCreateOrder(true)}>创建工单</Button>
                    </div>
                 </div>
              )}

           </div>
         </div>
       </div>
    );
  }

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
       const title = currentEquipment ? currentEquipment.name : "维修请求";
       const desc = selectedFault ? selectedFault : "报告的问题";
       // Ensure remarks are passed as remarks
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
              <h3 className="font-bold text-lg text-slate-800">新建工单</h3>
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
                 <h4 className="font-semibold text-slate-800">选择设备</h4>
               </div>
               <p className="text-xs text-slate-500 mb-4 px-1 flex items-center gap-1"><Info size={12}/> 选择故障的设备类型</p>
               
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
                  <h4 className="font-semibold text-slate-800">问题描述</h4>
                </div>
                
                {selectedEq && currentEquipment ? (
                  <div className="mb-4">
                     <p className="text-xs text-slate-500 mb-2 px-1">{currentEquipment.name} 常见问题：</p>
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
                  <p className="text-xs text-slate-400 italic mb-4 px-1">请先选择设备...</p>
                )}

                <label className="block text-xs font-bold text-slate-700 mb-1.5 px-1 uppercase tracking-wider">备注 / 详情</label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]" 
                  placeholder="例如：门禁密码是 1234..."
                />
             </div>

             {/* Step 3: Evidence */}
             <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                 <h4 className="font-semibold text-slate-800">照片凭证</h4>
               </div>
               
               {!manualPhoto ? (
                 <div 
                    onClick={() => manualFileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all"
                 >
                    <ImagePlus size={32} strokeWidth={1.5} className="mb-2"/>
                    <span className="text-xs font-medium">点击上传照片</span>
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
               提交工单
             </Button>
          </div>

        </div>
       </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={(tab) => { setActiveTab(tab); setSelectedOrder(null); }}
      onVoiceClick={() => setIsVoiceOpen(true)}
    >
      {activeTab === 'home' && renderHome()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'support' && renderSupport()}
      {activeTab === 'settings' && (
        <div className="flex items-center justify-center h-full text-slate-400">设置页面（待开发）</div>
      )}
      
      <SmartRepairModal />
      <VoiceRepairModal />
      <ManualFormModal />
      <LocationPickerModal />
      <EditRemarksModal />
      <PaymentModal />
      {renderNotifications()}
    </Layout>
  );
};

export default App;