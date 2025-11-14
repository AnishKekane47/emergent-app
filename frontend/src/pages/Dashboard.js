import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, TrendingUp, Activity, Shield, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '../components/Header';
import { connectWebSocket, disconnectWebSocket } from '../utils/websocket';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, pending: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    loadDashboardData();

    const socket = connectWebSocket(user.id, (alert) => {
      toast.error(`New ${alert.risk_level} Risk Alert!`, {
        description: `Transaction $${alert.amount} at ${alert.merchant}`,
        action: {
          label: 'View',
          onClick: () => navigate('/alerts'),
        },
      });
      loadDashboardData(); // Refresh data
    });

    return () => {
      disconnectWebSocket();
    };
  }, [user?.id, navigate]);

  const loadDashboardData = async () => {
    try {
      const [alertsRes, transactionsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/alerts?limit=5`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/transactions?limit=10`, { withCredentials: true })
      ]);

      const alerts = alertsRes.data;
      setRecentAlerts(alerts);

      // Calculate stats
      const stats = {
        total: alerts.length,
        critical: alerts.filter(a => a.risk_level === 'CRITICAL').length,
        high: alerts.filter(a => a.risk_level === 'HIGH').length,
        pending: alerts.filter(a => a.status === 'pending').length,
      };
      setStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header unreadAlerts={stats.pending} />

      <main className="max-w-7xl mx-auto px-6 py-8" data-testid="dashboard-main">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            Fraud Detection Dashboard
          </h1>
          <p className="text-gray-600">Monitor and manage fraud alerts in real-time</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Alerts"
            value={stats.total}
            icon={<Bell className="w-6 h-6" />}
            gradient="from-blue-500 to-cyan-500"
            testId="stat-total-alerts"
          />
          <StatCard
            title="Critical Risk"
            value={stats.critical}
            icon={<AlertTriangle className="w-6 h-6" />}
            gradient="from-red-500 to-orange-500"
            testId="stat-critical-alerts"
          />
          <StatCard
            title="High Risk"
            value={stats.high}
            icon={<TrendingUp className="w-6 h-6" />}
            gradient="from-orange-500 to-yellow-500"
            testId="stat-high-alerts"
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={<Activity className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-500"
            testId="stat-pending-alerts"
          />
        </div>

        {/* Recent Alerts */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Recent Alerts</CardTitle>
            <CardDescription>Latest fraud detection alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No alerts yet. System is monitoring transactions.</p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="recent-alerts-list">
                {recentAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} onClick={() => navigate('/alerts')} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, testId }) {
  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
          </div>
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center text-white shadow-md`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert, onClick }) {
  const riskColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200 border border-gray-200"
      data-testid={`alert-item-${alert.id}`}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColors[alert.risk_level] || riskColors.LOW}`}>
          {alert.risk_level}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">Transaction ID: {alert.transaction_id.substring(0, 8)}...</p>
          <p className="text-sm text-gray-500">Score: {alert.total_score.toFixed(2)} | Rules: {alert.violated_rules.length}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-600">{new Date(alert.created_at).toLocaleDateString()}</p>
        <p className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
