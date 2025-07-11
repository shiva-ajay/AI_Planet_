import React from 'react';
import { useNavigate } from 'react-router-dom';


const HomePage: React.FC = () => {
    const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#115e59] to-[#0f766e] text-white font-sans">      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-2">
          <img 
            src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512" 
            alt="AI Planet Logo" 
            className="h-8 w-auto"
          />
        </div>
        
        <nav className="flex items-center space-x-8">
          <div className="flex items-center space-x-1">
            <span className="text-white">Products</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-white">Models</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-white">Solutions</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <span className="text-white">Community</span>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
            Contact Us
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-8">
        <div className="text-center max-w-4xl">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Deploy <span className="text-yellow-400">GenAI Apps</span>
          </h1>
          <h2 className="text-6xl font-bold mb-8 leading-tight">
            in minutes, not months.
          </h2>
          
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Integrate reliable, private and secure GenAI solutions within your enterprise environment
          </p>
          
          <div className="flex items-center justify-center space-x-4 mb-16">
             <button
              className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              onClick={() => navigate('/stack-management')}
            >
              Get Started
            </button>
            <button className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors">
              Book Demo
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative z-10 bg-gray-900 rounded-2xl p-8 w-full max-w-4xl">
          <div className="grid grid-cols-3 text-center">
            <div className="py-6">
              <div className="text-4xl font-bold text-white mb-2">20x</div>
              <div className="text-gray-400">Faster time to market</div>
            </div>
            <div className="py-6 border-l border-r border-gray-600">
              <div className="text-4xl font-bold text-white mb-2">upto 30x</div>
              <div className="text-gray-400">Infra Cost Savings</div>
            </div>
            <div className="py-6">
              <div className="text-4xl font-bold text-white mb-2">10x</div>
              <div className="text-gray-400">Productivity Gains</div>
            </div>
          </div>
        </div>
      </main>

      {/* White background section that starts from middle of stats box */}
      <div className="bg-white relative -mt-20 pt-24">
        {/* Footer */}
        <footer className="text-center py-8">
          <p className="text-gray-600">
            Trusted by leading organizations and 300k+ global community
          </p>
        </footer>
      </div>

      {/* Floating Element */}
      <div className="fixed bottom-6 right-6">
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white font-bold">?</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;