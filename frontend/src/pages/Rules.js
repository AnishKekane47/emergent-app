import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Shield, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Header from '../components/Header';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';

export default function Rules() {
  useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'amount',
    condition: 'greater_than',
    threshold: '',
    weight: '0.5',
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/rules`, { withCredentials: true });
      setRules(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast.error('Failed to load rules');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        threshold: parseFloat(formData.threshold),
        weight: parseFloat(formData.weight),
      };

      if (editingRule) {
        await axios.patch(`${BACKEND_URL}/api/rules/${editingRule.id}`, data, { withCredentials: true });
        toast.success('Rule updated');
      } else {
        await axios.post(`${BACKEND_URL}/api/rules`, data, { withCredentials: true });
        toast.success('Rule created');
      }

      resetForm();
      loadRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    }
  };

  const toggleRule = async (ruleId, active) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/rules/${ruleId}`, { active: !active }, { withCredentials: true });
      toast.success(`Rule ${!active ? 'enabled' : 'disabled'}`);
      loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to toggle rule');
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/rules/${ruleId}`, { withCredentials: true });
      toast.success('Rule deleted');
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const editRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      condition: rule.condition,
      threshold: rule.threshold.toString(),
      weight: rule.weight.toString(),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'amount',
      condition: 'greater_than',
      threshold: '',
      weight: '0.5',
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const ruleTypeLabels = {
    amount: 'Transaction Amount',
    velocity: 'Transaction Velocity',
    location: 'Location Anomaly',
    merchant: 'Merchant Check',
    time: 'Time Pattern',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8" data-testid="rules-page">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              Fraud Detection Rules
            </h1>
            <p className="text-gray-600">Configure and manage fraud detection rules</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            data-testid="btn-new-rule"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Active Rules</CardTitle>
                <CardDescription>{rules.filter(r => r.active).length} of {rules.length} rules enabled</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No rules configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="rules-list">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        data-testid={`rule-${rule.id}`}
                        className={`p-4 rounded-lg border-2 ${
                          rule.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-gray-800">{rule.name}</h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                                {ruleTypeLabels[rule.rule_type]}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Threshold: {rule.threshold}</span>
                              <span>Weight: {rule.weight}</span>
                              <span>Condition: {rule.condition.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRule(rule.id, rule.active)}
                              data-testid={`toggle-rule-${rule.id}`}
                            >
                              {rule.active ? (
                                <Power className="w-4 h-4 text-green-600" />
                              ) : (
                                <PowerOff className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editRule(rule)}
                              data-testid={`edit-rule-${rule.id}`}
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRule(rule.id)}
                              data-testid={`delete-rule-${rule.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rule Form */}
          <div>
            <Card className={`shadow-lg border-0 lg:sticky lg:top-24 transition-all duration-300 ${showForm ? '' : 'opacity-50'}`}>
              <CardHeader>
                <CardTitle>{editingRule ? 'Edit Rule' : 'New Rule'}</CardTitle>
                <CardDescription>Configure fraud detection rule</CardDescription>
              </CardHeader>
              <CardContent>
                {!showForm ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Click "New Rule" to create a rule</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="rule-form">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., High Amount Alert"
                        required
                        data-testid="input-rule-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the rule..."
                        rows={3}
                        required
                        data-testid="input-rule-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rule_type">Rule Type</Label>
                      <select
                        id="rule_type"
                        value={formData.rule_type}
                        onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="select-rule-type"
                      >
                        <option value="amount">Transaction Amount</option>
                        <option value="velocity">Transaction Velocity</option>
                        <option value="location">Location Anomaly</option>
                        <option value="merchant">Merchant Check</option>
                        <option value="time">Time Pattern</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="condition">Condition</Label>
                      <select
                        id="condition"
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="select-rule-condition"
                      >
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="equals">Equals</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="threshold">Threshold</Label>
                      <Input
                        id="threshold"
                        type="number"
                        step="0.01"
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                        placeholder="e.g., 1000"
                        required
                        data-testid="input-rule-threshold"
                      />
                    </div>

                    <div>
                      <Label htmlFor="weight">Weight (0-1)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        required
                        data-testid="input-rule-weight"
                      />
                      <p className="text-xs text-gray-500 mt-1">Higher weight = more impact on fraud score</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        data-testid="btn-save-rule"
                      >
                        {editingRule ? 'Update' : 'Create'} Rule
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        data-testid="btn-cancel-rule"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
