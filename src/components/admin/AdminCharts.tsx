/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, MapPin, PackageCheck } from 'lucide-react';
import { Order } from '../../types';
import { formatPKR } from '../../utils/ecommerce-logic';
import {
  getRevenueTimeline,
  getOrderStatusBreakdown,
  getTopSellingProducts,
  getSalesByCity,
} from '../../utils/admin-analytics';

interface AdminChartsProps {
  orders: Order[];
}

export const AdminCharts: React.FC<AdminChartsProps> = ({ orders }) => {
  const [timelineDays, setTimelineDays] = useState<7 | 30 | 90>(7);

  const timelineData = useMemo(() => {
    return getRevenueTimeline(orders, timelineDays);
  }, [orders, timelineDays]);

  const statusData = useMemo(() => {
    return getOrderStatusBreakdown(orders).filter((s) => s.count > 0);
  }, [orders]);

  const topProducts = useMemo(() => {
    return getTopSellingProducts(orders, 5);
  }, [orders]);

  const cityData = useMemo(() => {
    return getSalesByCity(orders, 6);
  }, [orders]);

  const hasOrders = orders.length > 0;

  if (!hasOrders) {
    return (
      <div className="bg-white border border-[#0F3B2E]/10 rounded-sm p-8 text-center my-6">
        <div className="w-12 h-12 mx-auto mb-3 bg-[#F8F4EA] rounded-full flex items-center justify-center text-[#0F3B2E]">
          <TrendingUp className="w-6 h-6 text-[#B8963E]" />
        </div>
        <h3 className="font-serif text-lg text-[#0F3B2E] font-medium mb-1">Visual Analytics</h3>
        <p className="text-xs text-[#1C1C1C]/60 max-w-md mx-auto">
          No orders have been recorded yet. As customers place orders, real-time revenue curves, status breakdowns, and regional demand maps will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* 1. Main Revenue & Volume Curve */}
      <div className="bg-white border border-[#0F3B2E]/10 rounded-sm p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#0F3B2E]/10">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#B8963E]" />
              <h3 className="font-serif text-lg sm:text-xl text-[#0F3B2E] font-semibold tracking-wide">
                Revenue & Sales Trajectory
              </h3>
            </div>
            <p className="text-xs text-[#1C1C1C]/60 mt-0.5">
              Net gross sales across Pakistan (PKT) — excludes cancelled orders
            </p>
          </div>

          {/* Time range buttons */}
          <div className="inline-flex rounded-sm border border-[#0F3B2E]/20 p-0.5 bg-[#F8F4EA]/50 self-start sm:self-auto">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimelineDays(days)}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                  timelineDays === days
                    ? 'bg-[#0F3B2E] text-white shadow-xs'
                    : 'text-[#0F3B2E]/80 hover:text-[#0F3B2E] hover:bg-white/60'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F3B2E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0F3B2E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0F3B2E" strokeOpacity={0.07} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#1C1C1C', opacity: 0.6 }}
                tickLine={false}
                axisLine={{ stroke: '#0F3B2E', strokeOpacity: 0.15 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#1C1C1C', opacity: 0.6 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0F3B2E] text-[#F8F4EA] p-3 rounded-sm shadow-md text-xs border border-[#B8963E]/30 min-w-[140px]">
                        <div className="font-serif text-sm font-semibold text-[#B8963E] mb-1">{label}</div>
                        <div className="flex justify-between gap-4 py-0.5">
                          <span className="text-white/70">Revenue:</span>
                          <span className="font-semibold text-white">{formatPKR(data.revenue)}</span>
                        </div>
                        <div className="flex justify-between gap-4 py-0.5">
                          <span className="text-white/70">Orders:</span>
                          <span className="font-semibold text-white">{data.ordersCount}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0F3B2E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#emeraldGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column Row: Status Donut & Top Fragrances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <div className="bg-white border border-[#0F3B2E]/10 rounded-sm p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-[#B8963E]" />
              <h3 className="font-serif text-lg text-[#0F3B2E] font-semibold tracking-wide">
                Fulfillment Distribution
              </h3>
            </div>
            <p className="text-xs text-[#1C1C1C]/60 mb-4">Current state of all incoming client orders</p>
          </div>

          {statusData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-44 h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-[#0F3B2E] text-[#F8F4EA] px-2.5 py-1.5 rounded-sm text-xs border border-[#B8963E]/30">
                              <span className="font-medium text-[#B8963E]">{item.label}:</span>{' '}
                              <span className="text-white">{item.count} ({item.percentage}%)</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status breakdown legend list */}
              <div className="flex-1 w-full space-y-2 text-xs">
                {statusData.map((item) => (
                  <div key={item.status} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-[#1C1C1C]">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#1C1C1C]/70">
                      <span className="font-semibold text-[#0F3B2E]">{item.count}</span>
                      <span className="text-[11px] text-gray-400">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500">No status records available.</div>
          )}
        </div>

        {/* Top 5 Best-Selling Fragrances */}
        <div className="bg-white border border-[#0F3B2E]/10 rounded-sm p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PackageCheck className="w-4 h-4 text-[#B8963E]" />
              <h3 className="font-serif text-lg text-[#0F3B2E] font-semibold tracking-wide">
                Top Fragrances by Sales
              </h3>
            </div>
            <p className="text-xs text-[#1C1C1C]/60 mb-4">Leading creations by generated revenue</p>
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((prod, idx) => {
                const maxRevenue = topProducts[0]?.revenue || 1;
                const percent = Math.min(100, Math.round((prod.revenue / maxRevenue) * 100));
                return (
                  <div key={prod.id || idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#1C1C1C] truncate max-w-[200px] sm:max-w-[260px]">
                        {idx + 1}. {prod.name}
                      </span>
                      <span className="font-semibold text-[#0F3B2E] shrink-0">
                        {formatPKR(prod.revenue)}{' '}
                        <span className="text-[11px] font-normal text-gray-400">({prod.quantity} sold)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F8F4EA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#B8963E] to-[#0F3B2E] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500">No item sales recorded yet.</div>
          )}
        </div>
      </div>

      {/* 3. Regional Sales by City */}
      {cityData.length > 0 && (
        <div className="bg-white border border-[#0F3B2E]/10 rounded-sm p-4 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-[#B8963E]" />
            <h3 className="font-serif text-lg text-[#0F3B2E] font-semibold tracking-wide">
              Regional Demand by City
            </h3>
          </div>
          <p className="text-xs text-[#1C1C1C]/60 mb-4">Volume and gross revenue across Pakistani metropolitan centers</p>

          <div className="h-48 sm:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F3B2E" strokeOpacity={0.07} vertical={false} />
                <XAxis
                  dataKey="city"
                  tick={{ fontSize: 11, fill: '#1C1C1C', opacity: 0.7 }}
                  tickLine={false}
                  axisLine={{ stroke: '#0F3B2E', strokeOpacity: 0.15 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#1C1C1C', opacity: 0.6 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0F3B2E] text-[#F8F4EA] p-2.5 rounded-sm shadow-md text-xs border border-[#B8963E]/30">
                          <div className="font-serif text-sm font-semibold text-[#B8963E] mb-1">{label}</div>
                          <div className="flex justify-between gap-4 py-0.5">
                            <span className="text-white/70">Sales:</span>
                            <span className="font-semibold text-white">{formatPKR(data.revenue)}</span>
                          </div>
                          <div className="flex justify-between gap-4 py-0.5">
                            <span className="text-white/70">Orders:</span>
                            <span className="font-semibold text-white">{data.ordersCount}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" fill="#0F3B2E" radius={[2, 2, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
