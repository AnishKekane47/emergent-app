import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Header from '../components/Header';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Alerts({ user, setUser }) {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const url = filter === 'all' ? `${BACKEND_URL}/api/alerts` : `${BACKEND_URL}/api/alerts?status=${filter}`;
      const response = await axios.get(url, { withCredentials: true });
      setAlerts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('Failed to load alerts');
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId, status, note) => {
    try {
      await axios.patch(
        `${BACKEND_URL}/api/alerts/${alertId}`,
        { status, notes: note },
        { withCredentials: true }
      );
      toast.success(`Alert ${status}`);
      loadAlerts();
      setSelectedAlert(null);
      setNotes('');
    } catch (error) {
      console.error('Failed to update alert:', error);
      toast.error('Failed to update alert');
    }
  };

  const riskColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    LOW: 'bg-blue-100 text-blue-700 border-blue-300',
    SAFE: 'bg-green-100 text-green-700 border-green-300',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    false_positive: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header user={user} setUser={setUser} unreadAlerts={alerts.filter(a => a.status === 'pending').length} />

      <main className="max-w-7xl mx-auto px-6 py-8" data-testid="alerts-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            Fraud Alerts
          </h1>
          <p className="text-gray-600">Review and manage fraud detection alerts</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {['all', 'pending', 'investigating', 'resolved', 'false_positive'].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}-btn`}
              variant={filter === f ? 'default' : 'outline'}
              className={filter === f ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Alerts List */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Alerts</CardTitle>
              <CardDescription>{alerts.length} alert(s) found</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">No alerts found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto" data-testid="alerts-list">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      data-testid={`alert-${alert.id}`}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedAlert?.id === alert.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${riskColors[alert.risk_level]} px-2 py-1 text-xs font-bold border`}>
                          {alert.risk_level}
                        </Badge>
                        <Badge className={statusColors[alert.status]}>
                          {alert.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-800 mb-1">ID: {alert.id.substring(0, 12)}...</p>
                      <p className="text-sm text-gray-600 mb-2">Transaction: {alert.transaction_id.substring(0, 8)}...</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Score: {alert.total_score.toFixed(2)}</span>
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert Details */}
          <Card className="shadow-lg border-0 lg:sticky lg:top-24 lg:h-fit">
            <CardHeader>
              <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Alert Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAlert ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select an alert to view details</p>
                </div>
              ) : (
                <div className="space-y-6" data-testid="alert-details">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Risk Assessment</h3>
                    <div className="space-y-2">
                      <DetailRow label="Risk Level" value={selectedAlert.risk_level} badge={riskColors[selectedAlert.risk_level]} />
                      <DetailRow label="Total Score" value={selectedAlert.total_score.toFixed(3)} />
                      <DetailRow label="AI Score" value={selectedAlert.ai_score.toFixed(3)} />
                      <DetailRow label="Rule Score" value={selectedAlert.rule_score.toFixed(3)} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Violated Rules</h3>
                    {selectedAlert.violated_rules.length === 0 ? (
                      <p className="text-sm text-gray-500">No rules violated</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedAlert.violated_rules.map((rule, idx) => (
                          <div key={idx} className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {rule}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Alert Info</h3>
                    <div className="space-y-2">
                      <DetailRow label="Alert ID" value={selectedAlert.id} />
                      <DetailRow label="Transaction ID" value={selectedAlert.transaction_id} />
                      <DetailRow label="User ID" value={selectedAlert.user_id} />
                      <DetailRow label="Created" value={new Date(selectedAlert.created_at).toLocaleString()} />
                      <DetailRow label="Status" value={selectedAlert.status.replace('_', ' ')} badge={statusColors[selectedAlert.status]} />
                    </div>
                  </div>

                  {selectedAlert.notes && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-gray-800">Notes</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedAlert.notes}</p>
                    </div>
                  )}

                  {selectedAlert.status === 'pending' && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">Actions</h3>
                      <Textarea
                        placeholder="Add notes (optional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mb-3"
                        rows={3}
                        data-testid="alert-notes-input"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'investigating', notes)}
                          data-testid="btn-investigate"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Investigate
                        </Button>
                        <Button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'resolved', notes)}
                          data-testid="btn-resolve"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'false_positive', notes)}
                          data-testid="btn-false-positive"
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 col-span-2"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Mark as False Positive
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      {badge ? (
        <Badge className={`${badge} px-2 py-1 text-xs font-bold border`}>{value}</Badge>
      ) : (
        <span className="text-sm text-gray-800 font-mono">{value}</span>
      )}
    </div>
  );
}