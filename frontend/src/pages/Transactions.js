import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, DollarSign, MapPin, CreditCard, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '../components/Header';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Transactions({ user, setUser }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    merchant: '',
    location: '',
    card_type: 'credit',
    device_id: 'device_' + Math.random().toString(36).substr(2, 9)
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/transactions`, { withCredentials: true });
      setTransactions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${BACKEND_URL}/api/transactions`, {
        ...formData,
        amount: parseFloat(formData.amount)
      }, { withCredentials: true });

      toast.success('Transaction submitted for analysis');
      setFormData({
        amount: '',
        merchant: '',
        location: '',
        card_type: 'credit',
        device_id: 'device_' + Math.random().toString(36).substr(2, 9)
      });
      loadTransactions();
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      toast.error('Failed to submit transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header user={user} setUser={setUser} />

      <main className="max-w-7xl mx-auto px-6 py-8" data-testid="transactions-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            Transactions
          </h1>
          <p className="text-gray-600">Submit and monitor transactions</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Transaction Form */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>New Transaction</CardTitle>
              <CardDescription>Submit a transaction for fraud analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="transaction-form">
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="input-amount"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="merchant">Merchant</Label>
                  <Input
                    id="merchant"
                    placeholder="e.g., Amazon, Walmart"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                    required
                    data-testid="input-merchant"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="location"
                      placeholder="e.g., New York, USA"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="input-location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="card_type">Card Type</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      id="card_type"
                      value={formData.card_type}
                      onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="select-card-type"
                    >
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                      <option value="prepaid">Prepaid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="device_id">Device ID</Label>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="device_id"
                      value={formData.device_id}
                      onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="input-device-id"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6"
                  data-testid="submit-transaction-btn"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Send className="w-4 h-4 mr-2" />
                      Submit Transaction
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoStep number="1" title="Submit Transaction" description="Enter transaction details including amount, merchant, and location" />
              <InfoStep number="2" title="AI Analysis" description="Our AI model analyzes the transaction for fraud patterns" />
              <InfoStep number="3" title="Rule Engine" description="Configurable rules check for threshold violations" />
              <InfoStep number="4" title="Alert Generation" description="If fraud detected, alerts are created and you're notified" />
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Recent Transactions</CardTitle>
            <CardDescription>Your transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="transactions-list">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200" data-testid={`transaction-${txn.id}`}>
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                        ${txn.amount}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{txn.merchant}</p>
                        <p className="text-sm text-gray-500">{txn.location} • {txn.card_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">{new Date(txn.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{new Date(txn.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function InfoStep({ number, title, description }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {number}
      </div>
      <div>
        <p className="font-semibold text-gray-800 mb-1">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}