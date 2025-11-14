import { Shield, AlertTriangle, Brain, Bell, TrendingUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const handleLogin = () => navigate('/login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="px-6 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>FraudRadar</span>
          </div>
          <Button
            onClick={handleLogin}
            data-testid="header-login-btn"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Sign in
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <AlertTriangle className="w-4 h-4 mr-2" />
            AI-Powered Fraud Detection
          </div>
          
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
            style={{fontFamily: 'Space Grotesk, sans-serif'}}
            data-testid="hero-title"
          >
            Stop Fraud Before It Happens
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Advanced AI and rule-based detection to protect your business from fraudulent transactions in real-time. Get instant alerts and actionable insights.
          </p>
          
          <Button
            onClick={handleLogin}
            data-testid="hero-cta-btn"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-6 text-lg rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Brain className="w-8 h-8" />}
            title="AI-Powered Analysis"
            description="Advanced machine learning models analyze transaction patterns to detect anomalies and fraud attempts"
            gradient="from-blue-500 to-cyan-500"
          />
          <FeatureCard 
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Rule-Based Engine"
            description="Customizable fraud detection rules for amount thresholds, velocity checks, and location anomalies"
            gradient="from-indigo-500 to-purple-500"
          />
          <FeatureCard 
            icon={<Bell className="w-8 h-8" />}
            title="Real-Time Alerts"
            description="Instant notifications via WebSocket and email when suspicious activities are detected"
            gradient="from-purple-500 to-pink-500"
          />
          <FeatureCard 
            icon={<TrendingUp className="w-8 h-8" />}
            title="Risk Scoring"
            description="Combined AI and rule-based scoring system provides comprehensive fraud risk assessment"
            gradient="from-pink-500 to-rose-500"
          />
          <FeatureCard 
            icon={<Lock className="w-8 h-8" />}
            title="Secure & Compliant"
            description="Enterprise-grade security with password-based login, JWT cookies, and encrypted data storage"
            gradient="from-rose-500 to-orange-500"
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8" />}
            title="Alert Management"
            description="Track, investigate, and resolve fraud alerts with detailed audit trails and notes"
            gradient="from-orange-500 to-amber-500"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
            Ready to Protect Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start detecting fraud with AI-powered intelligence today
          </p>
          <Button
            onClick={handleLogin}
            data-testid="cta-signup-btn"
            className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-6 text-lg rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-800" style={{fontFamily: 'Space Grotesk, sans-serif'}}>FraudRadar</span>
            </div>
            <p className="text-sm text-gray-500">© 2025 FraudRadar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, gradient }) {
  return (
    <div className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-transparent">
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300" 
           style={{backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`}}>
      </div>
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center text-white mb-5 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-gray-800" style={{fontFamily: 'Space Grotesk, sans-serif'}}>{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}