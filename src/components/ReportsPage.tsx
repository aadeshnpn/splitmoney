'use client';

import { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { useHousehold } from '@/hooks/useHousehold';
import BottomNav from '@/components/BottomNav';
import { CATEGORY_META, ExpenseCategory } from '@/types';
import ReportKPIs from '@/components/ReportKPIs';
import CategoryDonutChart from '@/components/CategoryDonutChart';
import SpendingTrendChart from '@/components/SpendingTrendChart';
import MemberContributionChart from '@/components/MemberContributionChart';

type DatePreset = 'all' | 'by_month' | 'this_month' | 'last_month' | 'last_3_months' | 'ytd';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function ReportsPage() {
  const { expenses, loading } = useExpenses();
  const { members } = useHousehold();

  const now = useMemo(() => new Date(), []);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  };

  // Dynamically compute list of available years from expenses or fallback to last 3 years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(now.getFullYear());
    yearsSet.add(now.getFullYear() - 1);
    for (const e of expenses) {
      const d = parseLocalDate(e.date);
      if (!isNaN(d.getFullYear())) {
        yearsSet.add(d.getFullYear());
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [expenses, now]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setDatePreset('by_month');
    if (selectedMonth > 0) {
      setSelectedMonth(selectedMonth - 1);
    } else {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setDatePreset('by_month');
    if (selectedMonth < 11) {
      setSelectedMonth(selectedMonth + 1);
    } else {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    }
  };

  // Filter expenses based on selected filters
  const filteredExpenses = useMemo(() => {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter((e) => {
      if (e.isDeleted) return false;

      // 1. Category Filter
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      // 2. Member Filter
      if (selectedMember !== 'all' && e.paidBy !== selectedMember) {
        return false;
      }

      // 3. Date Preset Filter
      const expDate = parseLocalDate(e.date);
      if (isNaN(expDate.getTime())) return true;

      if (datePreset === 'by_month') {
        return expDate.getFullYear() === selectedYear && expDate.getMonth() === selectedMonth;
      }
      if (datePreset === 'this_month') {
        return expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
      }
      if (datePreset === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          expDate.getFullYear() === lastMonthDate.getFullYear() &&
          expDate.getMonth() === lastMonthDate.getMonth()
        );
      }
      if (datePreset === 'last_3_months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
        return expDate >= threeMonthsAgo;
      }
      if (datePreset === 'ytd') {
        return expDate.getFullYear() === currentYear;
      }

      return true;
    });
  }, [expenses, datePreset, selectedYear, selectedMonth, selectedCategory, selectedMember, now]);

  // Aggregate Category Data
  const categoryData = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of filteredExpenses) {
      map[e.category] = (map[e.category] || 0) + e.totalAmount;
    }
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat as ExpenseCategory,
        amount: amount || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // Total Spent
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [filteredExpenses]);

  // Top Category
  const topCategoryData = categoryData[0] || null;

  // Monthly Spending Trend
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    for (const e of filteredExpenses) {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) continue;
      const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[monthKey] = (monthMap[monthKey] || 0) + e.totalAmount;
    }
    return Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));
  }, [filteredExpenses]);

  // Member Payments vs Share Data
  const memberContributionData = useMemo(() => {
    if (members.length === 0) return [];
    return members.map((m) => {
      const paid = filteredExpenses
        .filter((e) => e.paidBy === m.userId)
        .reduce((sum, e) => sum + e.totalAmount, 0);
      const share = filteredExpenses
        .filter((e) => e.paidBy === m.userId)
        .reduce((sum, e) => sum + Math.round(e.totalAmount / (members.length || 1)), 0);

      return {
        name: m.user?.displayName?.split(' ')[0] || 'Member',
        paid,
        share,
      };
    });
  }, [filteredExpenses, members]);

  // CSV Export Function
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense data to export.');
      return;
    }

    const headers = ['ID', 'Title', 'Amount (USD)', 'Category', 'Paid By', 'Date'];
    const rows = filteredExpenses.map((e) => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      (e.totalAmount / 100).toFixed(2),
      e.category,
      e.paidBy,
      e.date,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `splitmoney_report_${datePreset === 'by_month' ? `${MONTH_NAMES[selectedMonth]}_${selectedYear}` : datePreset}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1rem', paddingBottom: '100px', minHeight: '100vh', maxWidth: '650px', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Analytics & Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Household spending insights
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          📥 Export CSV
        </button>
      </header>

      {/* Filter Controls Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--border)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Time Range Preset Filter */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
                fontWeight: 500,
              }}
            >
              Time Range
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="all">All Time</option>
              <option value="by_month">📅 Specific Month & Year</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
                fontWeight: 500,
              }}
            >
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Member Filter */}
          {members.length > 0 && (
            <div style={{ flex: 1, minWidth: '130px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                  fontWeight: 500,
                }}
              >
                Paid By
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName || 'User'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Year / Month Specific Selector Controls & Navigation Toolbar */}
        {datePreset === 'by_month' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            {/* Prev Month Button */}
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ◀ Prev
            </button>

            {/* Month & Year Selection Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Month Button */}
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : (
        <>
          {/* Executive KPI Summary */}
          <ReportKPIs
            totalSpent={totalSpent}
            memberCount={members.length || 1}
            transactionCount={filteredExpenses.length}
            topCategory={topCategoryData?.category || null}
            topCategoryAmount={topCategoryData?.amount || 0}
          />

          {/* Category Donut Breakdown */}
          <CategoryDonutChart data={categoryData} totalSpent={totalSpent} />

          {/* Monthly Trend Chart */}
          {monthlyTrendData.length > 1 && <SpendingTrendChart monthlyData={monthlyTrendData} />}

          {/* Member Contribution Chart */}
          {members.length > 1 && <MemberContributionChart memberData={memberContributionData} />}
        </>
      )}

      <BottomNav />
    </div>
  );
}
