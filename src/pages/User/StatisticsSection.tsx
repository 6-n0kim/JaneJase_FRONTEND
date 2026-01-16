import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface Session {
  pose_id: string;
  created_at: string;
  warning_count: number;
  total_unfocus_time: number;
}

interface StatisticsSectionProps {
  history: Session[];
}

export default function StatisticsSection({ history }: StatisticsSectionProps) {
  // Process data for charts
  const chartData = useMemo(() => {
    // Sort by date ascending (oldest to newest) for the chart
    return [...history]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map(session => ({
        date: new Date(session.created_at).toLocaleDateString(),
        warnings: session.warning_count,
        unfocusTime: Math.round(session.total_unfocus_time / 60), // Convert to minutes
        rawDate: session.created_at,
      }));
  }, [history]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (history.length === 0)
      return { totalSessions: 0, avgWarnings: 0, avgUnfocusTime: 0 };

    const totalSessions = history.length;
    const totalWarnings = history.reduce(
      (sum, item) => sum + item.warning_count,
      0
    );
    const totalUnfocusTime = history.reduce(
      (sum, item) => sum + item.total_unfocus_time,
      0
    );

    return {
      totalSessions,
      avgWarnings: Math.round((totalWarnings / totalSessions) * 10) / 10,
      avgUnfocusTime:
        Math.round((totalUnfocusTime / totalSessions / 60) * 10) / 10, // Minutes
    };
  }, [history]);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border shadow-soft flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
          <div className="text-primary mb-2">
            <span className="material-symbols-outlined text-4xl">
              fitness_center
            </span>
          </div>
          <div className="text-3xl font-bold text-text">
            {summary.totalSessions}
          </div>
          <div className="text-sm text-text-muted mt-1">총 교정 횟수</div>
        </div>

        <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border shadow-soft flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
          <div className="text-danger mb-2">
            <span className="material-symbols-outlined text-4xl">warning</span>
          </div>
          <div className="text-3xl font-bold text-text">
            {summary.avgWarnings}
          </div>
          <div className="text-sm text-text-muted mt-1">평균 경고 횟수</div>
        </div>

        <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border shadow-soft flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
          <div className="text-secondary mb-2">
            <span className="material-symbols-outlined text-4xl">schedule</span>
          </div>
          <div className="text-3xl font-bold text-text">
            {summary.avgUnfocusTime}
            <span className="text-lg font-normal ml-1">분</span>
          </div>
          <div className="text-sm text-text-muted mt-1">평균 흐트러짐</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warning Trend Chart */}
        <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border shadow-soft">
          <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-danger">
              show_chart
            </span>
            자세 경고 추이
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="warnings"
                  name="경고 횟수"
                  stroke="#ef4444" // danger color
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unfocus Time Chart */}
        <div className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border shadow-soft">
          <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">
              bar_chart
            </span>
            흐트러짐 시간 (분)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Legend />
                <Bar
                  dataKey="unfocusTime"
                  name="흐트러짐(분)"
                  fill="#3b82f6" // secondary/primary color
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
