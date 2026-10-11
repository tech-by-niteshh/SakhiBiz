import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Tag, 
  FileText, 
  ShieldAlert, 
  BookMarked, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  FileDown,
  Info
} from 'lucide-react';
import { Language, ExpenseRecord, BusinessPlan, UserProfile } from '../types';
import { getText } from '../utils/translations';

interface ToolkitPageProps {
  currentLang: Language;
  user: UserProfile;
  expenses: ExpenseRecord[];
  onAddExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'userId'>) => Promise<void> | void;
  onDeleteExpense: (id: string) => Promise<void> | void;
  businessPlans: BusinessPlan[];
  onSaveBusinessPlan: (plan: BusinessPlan) => Promise<void> | void;
}

export const ToolkitPage: React.FC<ToolkitPageProps> = ({
  currentLang,
  user,
  expenses,
  onAddExpense,
  onDeleteExpense,
  businessPlans,
  onSaveBusinessPlan,
}) => {
  const [activeTab, setActiveTab] = useState<
    'profit' | 'expense' | 'pricing' | 'planner' | 'safety' | 'resources'
  >('profit');

  // --- 1. PROFIT CALCULATOR STATE ---
  const [profitData, setProfitData] = useState({
    productName: 'कढ़ाई वाला कॉटन सूट (Cotton Suit)',
    unitCost: 280,
    sellingPrice: 420,
    quantity: 15,
  });

  const totalCost = Math.max(0, profitData.unitCost) * Math.max(0, profitData.quantity);
  const totalRevenue = Math.max(0, profitData.sellingPrice) * Math.max(0, profitData.quantity);
  const netProfit = totalRevenue - totalCost;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // --- 2. EXPENSE TRACKER STATE ---
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'raw_materials' as ExpenseRecord['category'],
    amount: '',
    description: '',
    paymentMethod: 'upi' as ExpenseRecord['paymentMethod'],
  });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsAddingExpense(true);
    try {
      await onAddExpense({
        date: newExpense.date,
        category: newExpense.category,
        amount: amountNum,
        description: newExpense.description || 'व्यावसायिक व्यय',
        paymentMethod: newExpense.paymentMethod,
      });

      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        category: 'raw_materials',
        amount: '',
        description: '',
        paymentMethod: 'upi',
      });
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await onDeleteExpense(id);
  };

  const filteredExpenses = expenses.filter((e) => 
    expenseFilter === 'all' ? true : e.category === expenseFilter
  );

  const totalFilteredExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  // --- 3. PRICING ASSISTANT STATE ---
  const [pricingData, setPricingData] = useState({
    materialCost: 180,
    laborHours: 2.5,
    hourlyWage: 50,
    packagingTransport: 35,
    desiredMarginPercent: 35,
  });

  const laborTotal = pricingData.laborHours * pricingData.hourlyWage;
  const baseCost = pricingData.materialCost + laborTotal + pricingData.packagingTransport;
  const marginMultiplier = 1 - (pricingData.desiredMarginPercent / 100);
  const suggestedSellingPrice = marginMultiplier > 0 ? Math.round(baseCost / marginMultiplier) : Math.round(baseCost * 1.5);
  const calculatedProfitRupees = suggestedSellingPrice - baseCost;

  // --- 4. BUSINESS PLANNER STATE ---
  const defaultEmptyPlan: BusinessPlan = {
    id: 'plan-1',
    userId: user.id,
    businessName: '',
    businessType: 'textiles_tailoring',
    productDescription: '',
    targetCustomer: '',
    estimatedStartupCost: 10000,
    monthlySalesGoal: 20000,
    marketingPlan: '',
    updatedAt: new Date().toISOString(),
  };

  const [planForm, setPlanForm] = useState<BusinessPlan>(
    businessPlans[0] || defaultEmptyPlan
  );
  const [planSaveNotification, setPlanSaveNotification] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Sync if business plans loaded asynchronously
  React.useEffect(() => {
    if (businessPlans.length > 0 && !planForm.businessName) {
      setPlanForm(businessPlans[0]);
    }
  }, [businessPlans]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true);
    try {
      await onSaveBusinessPlan(planForm);
      setPlanSaveNotification(true);
      setTimeout(() => setPlanSaveNotification(false), 3000);
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
            {currentLang === 'hi' ? 'व्यावसायिक साधन एवं सहायता' : 'Practical Micro-Business Tools'}
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-[#18392B] mt-1">
            {getText('toolsTitle', currentLang)}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
            {getText('toolsSubtitle', currentLang)}
          </p>
        </div>

        {/* Toolkit Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'profit'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabProfitCalc', currentLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'expense'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabExpenseTracker', currentLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'pricing'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Tag className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabPricingAssistant', currentLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'planner'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabBusinessPlanner', currentLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'safety'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabDigitalSafety', currentLang)}</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'bg-[#18392B] text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <BookMarked className="w-4 h-4 text-[#FFD5C8]" />
            <span>{getText('tabResources', currentLang)}</span>
          </button>
        </div>

        {/* --- 1. TAB: PROFIT CALCULATOR --- */}
        {activeTab === 'profit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="font-serif text-xl font-bold text-[#18392B]">
                  {getText('tabProfitCalc', currentLang)}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {currentLang === 'hi'
                    ? 'अपने उत्पाद का नाम, लागत और बिक्री मूल्य दर्ज करें'
                    : 'Input single unit cost, sale price, and quantity to see exact margins'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {getText('productNameLabel', currentLang)}
                  </label>
                  <input
                    type="text"
                    value={profitData.productName}
                    onChange={(e) => setProfitData({ ...profitData, productName: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {getText('unitCostLabel', currentLang)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={profitData.unitCost}
                      onChange={(e) => setProfitData({ ...profitData, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {getText('sellingPriceLabel', currentLang)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={profitData.sellingPrice}
                      onChange={(e) => setProfitData({ ...profitData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {getText('quantitySoldLabel', currentLang)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={profitData.quantity}
                      onChange={(e) => setProfitData({ ...profitData, quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#18392B] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setProfitData({ productName: '', unitCost: 0, sellingPrice: 0, quantity: 1 })}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{getText('resetBtn', currentLang)}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Profit Results Card */}
            <div className="lg:col-span-5 bg-[#18392B] text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FFD5C8]">
                  {currentLang === 'hi' ? 'गणना परिणाम (Results)' : 'Calculation Summary'}
                </span>
                <h3 className="font-serif text-xl font-bold mt-1 text-white">
                  {profitData.productName || (currentLang === 'hi' ? 'उत्पाद सारांश' : 'Product Summary')}
                </h3>
              </div>

              <div className="space-y-4 border-t border-[#244f3d] pt-4 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#C9D6CE]">
                  <span>{getText('totalCostLabel', currentLang)}:</span>
                  <span className="font-semibold text-white">₹{totalCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-[#C9D6CE]">
                  <span>{getText('totalRevenueLabel', currentLang)}:</span>
                  <span className="font-semibold text-white">₹{totalRevenue.toLocaleString('en-IN')}</span>
                </div>

                <div className="border-t border-[#244f3d] pt-3 flex justify-between items-center text-base sm:text-lg font-bold">
                  <span>{getText('netProfitLabel', currentLang)}:</span>
                  <span className={netProfit >= 0 ? 'text-[#FFD5C8]' : 'text-rose-400'}>
                    {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#122A20] p-4 rounded-2xl border border-[#244f3d]">
                  <span className="font-medium text-[#C9D6CE]">
                    {getText('profitMarginLabel', currentLang)}:
                  </span>
                  <span className={`font-serif text-2xl font-extrabold ${profitMarginPercent >= 25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {profitMarginPercent}%
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[#A2B6AC] bg-[#1c3f30] p-3 rounded-xl border border-[#2d5c47] leading-relaxed">
                💡 {currentLang === 'hi'
                  ? 'सखी सलाह: यदि आपका मुनाफा 25% से कम है, तो अपनी मजदूरी या पैकिंग खर्च को घटाने के बजाय उत्पाद के सही मूल्य को थोड़ा बढ़ाएं।'
                  : 'Sakhi Tip: Aim for at least 25-35% profit margin so your enterprise can withstand seasonal downturns.'}
              </div>
            </div>
          </div>
        )}

        {/* --- 2. TAB: EXPENSE TRACKER --- */}
        {activeTab === 'expense' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Add Form */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-serif text-lg font-bold text-[#18392B]">
                  {getText('addExpenseTitle', currentLang)}
                </h2>
                <p className="text-xs text-gray-500">
                  {currentLang === 'hi' ? 'दुकान या घर के व्यवसाय का दैनिक खर्च दर्ज करें' : 'Record everyday supplies and operations'}
                </p>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('expenseDate', currentLang)}
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('expenseCategory', currentLang)}
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="raw_materials">{currentLang === 'hi' ? 'कच्चा माल (कपड़ा, मसाले, सामान)' : 'Raw Materials'}</option>
                    <option value="packaging">{currentLang === 'hi' ? 'पैकिंग व डिब्बे' : 'Packaging'}</option>
                    <option value="transport">{currentLang === 'hi' ? 'आने-जाने का किराया / ट्रांसपोर्ट' : 'Transport'}</option>
                    <option value="utilities_rent">{currentLang === 'hi' ? 'बिजली / गैस / किराया' : 'Utilities & Rent'}</option>
                    <option value="tools_equipment">{currentLang === 'hi' ? 'औजार / मशीन मरम्मत' : 'Equipment & Tools'}</option>
                    <option value="other">{currentLang === 'hi' ? 'अन्य विविध खर्च' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('expenseAmount', currentLang)}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="500"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {getText('expenseDesc', currentLang)}
                  </label>
                  <input
                    type="text"
                    required
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder={currentLang === 'hi' ? 'थोक मंडी से खरीदारी' : 'Bulk supplies purchase'}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? 'भुगतान का तरीका' : 'Payment Method'}
                  </label>
                  <div className="flex gap-2">
                    {(['upi', 'cash', 'bank_transfer'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setNewExpense({ ...newExpense, paymentMethod: method })}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase border transition-all ${
                          newExpense.paymentMethod === method
                            ? 'bg-[#18392B] text-white border-[#18392B]'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#E07A5F] hover:bg-[#d66b50] text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{getText('addExpenseBtn', currentLang)}</span>
                </button>
              </form>
            </div>

            {/* Right: Expense Ledger & Filter */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#18392B]">
                    {currentLang === 'hi' ? 'दैनिक बहीखाता (Expense Ledger)' : 'Expense Ledger History'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {filteredExpenses.length} {currentLang === 'hi' ? 'प्रविष्टियां' : 'records logged'}
                  </p>
                </div>

                <div className="text-right bg-[#E8ECE9] px-4 py-2 rounded-xl">
                  <span className="text-[10px] text-gray-600 font-semibold block">
                    {getText('totalExpensesLabel', currentLang)}
                  </span>
                  <span className="font-serif text-lg font-extrabold text-[#18392B]">
                    ₹{totalFilteredExpense.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {['all', 'raw_materials', 'packaging', 'transport', 'utilities_rent'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setExpenseFilter(cat)}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-all ${
                      expenseFilter === cat
                        ? 'bg-[#18392B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'all' ? (currentLang === 'hi' ? 'सभी' : 'All') : cat}
                  </button>
                ))}
              </div>

              {/* Records List */}
              {filteredExpenses.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  {getText('noExpensesYet', currentLang)}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-1">
                  {filteredExpenses.map((exp) => (
                    <div key={exp.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">{exp.description}</span>
                          <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {exp.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {exp.date} • {exp.category}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs sm:text-sm text-[#18392B]">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 3. TAB: PRICING ASSISTANT --- */}
        {activeTab === 'pricing' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="font-serif text-xl font-bold text-[#18392B]">
                  {getText('tabPricingAssistant', currentLang)}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {currentLang === 'hi'
                    ? 'सामग्री, अपनी मजदूरी और लक्षित मार्जिन से सही मूल्य तय करें'
                    : 'Calculate a viable price including your own hourly wages'}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '1. कच्चा माल लागत (₹)' : '1. Material Cost (₹)'}
                  </label>
                  <input
                    type="number"
                    value={pricingData.materialCost}
                    onChange={(e) => setPricingData({ ...pricingData, materialCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      {currentLang === 'hi' ? '2. बनाने में लगा समय (घंटे)' : '2. Labor Hours (Hours)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingData.laborHours}
                      onChange={(e) => setPricingData({ ...pricingData, laborHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      {currentLang === 'hi' ? '3. आपकी प्रति घंटा मजदूरी (₹)' : '3. Hourly Wage Rate (₹/hr)'}
                    </label>
                    <input
                      type="number"
                      value={pricingData.hourlyWage}
                      onChange={(e) => setPricingData({ ...pricingData, hourlyWage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '4. पैकिंग, बिजली व आने-जाने का खर्च (₹)' : '4. Overheads & Packaging (₹)'}
                  </label>
                  <input
                    type="number"
                    value={pricingData.packagingTransport}
                    onChange={(e) => setPricingData({ ...pricingData, packagingTransport: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-gray-700">
                      {currentLang === 'hi' ? '5. लक्षित मुनाफा मार्जिन' : '5. Desired Profit Margin'}:
                    </label>
                    <span className="font-bold text-[#E07A5F] text-sm">{pricingData.desiredMarginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={pricingData.desiredMarginPercent}
                    onChange={(e) => setPricingData({ ...pricingData, desiredMarginPercent: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#18392B]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>15% (किफ़ायती)</span>
                    <span>35% (संतुलित)</span>
                    <span>60% (प्रीमियम कला)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Results Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                  {currentLang === 'hi' ? 'सखी सुझाव' : 'Recommended Price'}
                </span>
                <h3 className="font-serif text-2xl font-extrabold text-[#18392B] mt-1">
                  ₹{suggestedSellingPrice.toLocaleString('en-IN')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentLang === 'hi' ? 'प्रति पीस न्यूनतम अनुशंसित बिक्री मूल्य' : 'Minimum viable retail selling price'}
                </p>

                <div className="mt-6 space-y-3 text-xs border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>{currentLang === 'hi' ? 'कच्चा माल:' : 'Material:'}</span>
                    <span className="font-semibold text-gray-900">₹{pricingData.materialCost}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{currentLang === 'hi' ? 'आपकी मेहनत (श्रम):' : 'Artisan Labor:'}</span>
                    <span className="font-semibold text-gray-900">₹{laborTotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{currentLang === 'hi' ? 'पैकिंग व अन्य खर्च:' : 'Overheads:'}</span>
                    <span className="font-semibold text-gray-900">₹{pricingData.packagingTransport}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                    <span>{currentLang === 'hi' ? 'कुल आधार लागत (Base Cost):' : 'Total Base Cost:'}</span>
                    <span>₹{baseCost}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{currentLang === 'hi' ? 'व्यापार का शुद्ध मुनाफा:' : 'Net Enterprise Profit:'}</span>
                    <span>+₹{calculatedProfitRupees}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FBF9F5] p-4 rounded-2xl border border-gray-200/80 mt-6 text-xs text-gray-700">
                <span className="font-bold text-[#18392B] block mb-1">
                  💬 {currentLang === 'hi' ? 'ग्राहक से कैसे बात करें?' : 'Sales Pitch Tip:'}
                </span>
                {currentLang === 'hi'
                  ? 'यदि ग्राहक मोलभाव करे तो कहें: "दीदी, यह शुद्ध हाथ की कारीगरी है और इसमें उच्च कोटि का कपड़ा लगाया गया है। इस दाम में आपको कई वर्षों तक चलने वाली गुणवत्ता मिलेगी।"'
                  : 'Articulate your quality: Highlight personal attention to detail and durable materials over mass-produced imports.'}
              </div>
            </div>
          </div>
        )}

        {/* --- 4. TAB: SIMPLE BUSINESS PLANNER --- */}
        {activeTab === 'planner' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                  {currentLang === 'hi' ? 'व्यवसाय योजना निर्माता' : 'Guided Business Planner'}
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#18392B] mt-0.5">
                  {getText('tabBusinessPlanner', currentLang)}
                </h2>
              </div>

              {planSaveNotification && (
                <div className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{currentLang === 'hi' ? 'योजना सहेजी गई!' : 'Plan Saved!'}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePlan} className="space-y-6 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '1. व्यवसाय / दुकान का नाम' : '1. Enterprise / Brand Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.businessName}
                    onChange={(e) => setPlanForm({ ...planForm, businessName: e.target.value })}
                    placeholder={currentLang === 'hi' ? 'सुनीता हस्तशिल्प' : 'Sunita Handicrafts'}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '2. उद्योग की श्रेणी' : '2. Business Category'}
                  </label>
                  <select
                    value={planForm.businessType}
                    onChange={(e) => setPlanForm({ ...planForm, businessType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  >
                    <option value="textiles_tailoring">सिलाई एवं वस्त्र (Textiles & Garments)</option>
                    <option value="food_processing_snacks">घरेलू खाद्य पदार्थ एवं आचार (Food & Snacks)</option>
                    <option value="handicrafts_art">हस्तशिल्प व कला (Handicrafts & Art)</option>
                    <option value="beauty_wellness">ब्यूटी पार्लर व साज-सज्जा (Beauty Parlor)</option>
                    <option value="grocery_retail">किराना व खुदरा दुकान (Kirana & Retail)</option>
                    <option value="dairy_agriculture">डेयरी व कृषि उत्पाद (Dairy & Agriculture)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {currentLang === 'hi' ? '3. आपके मुख्य उत्पाद या सेवाएं' : '3. Key Products or Services Offered'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={planForm.productDescription}
                  onChange={(e) => setPlanForm({ ...planForm, productDescription: e.target.value })}
                  placeholder={currentLang === 'hi' ? 'हाथ की कढ़ाई वाले कॉटन सूट, कुर्तियां और डिजाइनर थैले।' : 'Handmade cotton dresses and eco-friendly tote bags.'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {currentLang === 'hi' ? '4. आपके ग्राहक कौन हैं? (Target Customers)' : '4. Who are your Target Customers?'}
                </label>
                <input
                  type="text"
                  required
                  value={planForm.targetCustomer}
                  onChange={(e) => setPlanForm({ ...planForm, targetCustomer: e.target.value })}
                  placeholder={currentLang === 'hi' ? 'मोहल्ले और आस-पास के कस्बे की महिलाएं और कॉलेज छात्राएं।' : 'Local neighborhood women, college students, and festival stalls.'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '5. अनुमानित शुरुआती पूंजी (₹)' : '5. Estimated Startup Capital (₹)'}
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={planForm.estimatedStartupCost}
                    onChange={(e) => setPlanForm({ ...planForm, estimatedStartupCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {currentLang === 'hi' ? '6. मासिक बिक्री का लक्ष्य (₹)' : '6. Monthly Revenue Goal (₹)'}
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={planForm.monthlySalesGoal}
                    onChange={(e) => setPlanForm({ ...planForm, monthlySalesGoal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {currentLang === 'hi' ? '7. प्रचार व मार्केटिंग की योजना' : '7. Marketing & Outreach Strategy'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={planForm.marketingPlan}
                  onChange={(e) => setPlanForm({ ...planForm, marketingPlan: e.target.value })}
                  placeholder={currentLang === 'hi' ? 'WhatsApp Business कैटलॉग, हर सोमवार स्टेटस अपडेट और पुराने ग्राहकों से नए ऑर्डर।' : 'WhatsApp status updates, referral discounts for regular buyers.'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-6 py-3 bg-[#18392B] hover:bg-[#244f3d] disabled:opacity-60 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4 text-[#FFD5C8]" />
                  <span>{isSavingPlan ? (currentLang === 'hi' ? 'सहेजा जा रहा है...' : 'Saving...') : (currentLang === 'hi' ? 'योजना सहेजें (Save Plan)' : 'Save Business Plan')}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- 5. TAB: DIGITAL SAFETY GUIDE --- */}
        {activeTab === 'safety' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#18392B]">
                    {getText('tabDigitalSafety', currentLang)}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {currentLang === 'hi' ? 'ऑनलाइन धोखाधड़ी से अपनी कमाई बचाने के 5 अचूक नियम' : 'Core safety rules to guard your digital money'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950">
                      {currentLang === 'hi' ? 'नियम 1: पैसे लेने के लिए PIN नहीं डाला जाता' : 'Rule 1: Never Enter PIN to Receive Funds'}
                    </h4>
                    <p className="text-emerald-800 text-xs mt-0.5">
                      {currentLang === 'hi'
                        ? 'पैसे प्राप्त करने के लिए कभी भी UPI PIN डालने की ज़रूरत नहीं होती। यदि कोई कहे कि "पिन डालो पैसे आ जाएंगे", तो तुरंत फोन काट दें!'
                        : 'Entering a UPI PIN only deducts money from your account. Receiving funds requires ZERO PIN.'}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950">
                      {currentLang === 'hi' ? 'नियम 2: फर्जी स्क्रीनशॉट से सावधान' : 'Rule 2: Reject Unverified Screenshots'}
                    </h4>
                    <p className="text-amber-800 text-xs mt-0.5">
                      {currentLang === 'hi'
                        ? 'ग्राहक के फोन के हरे टिक या फोटो पर भरोसा न करें। अपने फोन के SMS या साउंडबॉक्स की आवाज सुनने के बाद ही सामान सौंपें।'
                        : 'Verify credit exclusively through your own phone SMS or merchant voice box before handing over goods.'}
                    </p>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-950">
                      {currentLang === 'hi' ? 'नियम 3: कभी न शेयर करें OTP या पासवर्ड' : 'Rule 3: OTP is Strictly Confidential'}
                    </h4>
                    <p className="text-rose-800 text-xs mt-0.5">
                      {currentLang === 'hi'
                        ? 'बैंक का कोई भी सच्चा कर्मचारी कभी भी आपसे फोन पर OTP या पासवर्ड नहीं मांगता।'
                        : 'Legitimate bank managers will never ask you for an SMS OTP over the phone.'}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-950">
                      {currentLang === 'hi' ? 'नियम 4: साइबर आपातकालीन हेल्पलाइन 1930' : 'Rule 4: Emergency Helpline 1930'}
                    </h4>
                    <p className="text-blue-800 text-xs mt-0.5">
                      {currentLang === 'hi'
                        ? 'यदि किसी कारण से धोखाधड़ी हो जाए, तो तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट दर्ज करें। 24 घंटे के अंदर सूचना देने पर पैसे होल्ड होने की संभावना बढ़ जाती है।'
                        : 'Dial 1930 immediately if any unauthorized transaction occurs to freeze funds in transit.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 6. TAB: GOVERNMENT SCHEMES DIRECTORY --- */}
        {activeTab === 'resources' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <span className="text-xs font-bold text-[#E07A5F] uppercase tracking-wider">
                  {currentLang === 'hi' ? 'आधिकारिक स्रोत' : 'Official Verified Portals'}
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#18392B] mt-0.5">
                  {getText('tabResources', currentLang)}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {currentLang === 'hi'
                    ? 'महिला उद्यमियों के लिए भारत सरकार की वास्तविक योजनाएं एवं पोर्टल'
                    : 'Authentic government programs for women micro-entrepreneurs'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Scheme 1 */}
                <div className="p-5 rounded-2xl border border-gray-200 hover:border-[#18392B] transition-all bg-[#FBF9F5]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm sm:text-base text-[#18392B]">
                      1. प्रधानमंत्री मुद्रा योजना (PMMY)
                    </h4>
                    <a
                      href="https://www.mudra.org.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#E07A5F] hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>mudra.org.in</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentLang === 'hi'
                      ? 'शिशु श्रेणी में ₹50,000 तक बिना किसी गारंटी के सिलाई मशीन, किराना दुकान या गृह-उद्योग शुरू करने के लिए ऋण। किसी भी सरकारी या ग्रामीण बैंक में आवेदन करें।'
                      : 'Collateral-free micro-loans up to ₹50,000 under Shishu tier to purchase machinery, seeds, and raw stock.'}
                  </p>
                </div>

                {/* Scheme 2 */}
                <div className="p-5 rounded-2xl border border-gray-200 hover:border-[#18392B] transition-all bg-[#FBF9F5]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm sm:text-base text-[#18392B]">
                      2. उद्यम आधार रजिस्ट्रेशन (Udyam MSME)
                    </h4>
                    <a
                      href="https://udyamregistration.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#E07A5F] hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>udyamregistration.gov.in</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentLang === 'hi'
                      ? 'भारत सरकार का आधिकारिक एमएसएमई प्रमाण पत्र। 100% मुफ़्त है। किसी दलाल को पैसे न दें। इससे बैंक लोन में प्राथमिकता और ब्याज सब्सिडी मिलती है।'
                      : 'Free official Central Government MSME certification with zero registration fee.'}
                  </p>
                </div>

                {/* Scheme 3 */}
                <div className="p-5 rounded-2xl border border-gray-200 hover:border-[#18392B] transition-all bg-[#FBF9F5]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm sm:text-base text-[#18392B]">
                      3. स्टैंड-अप इंडिया योजना (Stand-Up India)
                    </h4>
                    <a
                      href="https://www.standupmitra.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#E07A5F] hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>standupmitra.in</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentLang === 'hi'
                      ? 'महिला उद्यमियों को विनिर्माण या सेवा क्षेत्र में नया व्यवसाय स्थापित करने के लिए ₹10 लाख से ₹1 करोड़ तक का बैंक ऋण।'
                      : 'Bank credit facilitation between ₹10 lakh to ₹1 crore for greenfield manufacturing and service ventures led by women.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
