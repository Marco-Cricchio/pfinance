'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, BarChart3, TrendingUp, Brain, Lightbulb, Upload, Tag, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AmountVisibilityProvider } from '@/contexts/AmountVisibilityContext';
import { AmountVisibilityToggle } from '@/components/AmountVisibilityToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        // Trigger a page reload to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recategorizeTransactions = async () => {
    if (confirm('Do you want to recategorize all existing transactions with new categorization rules?')) {
      setLoading(true);
      try {
        const response = await fetch('/api/recategorize', { method: 'POST' });
        if (response.ok) {
          const result = await response.json();
          alert(`Recategorization completed: ${result.updatedCount} transactions updated.`);
          window.location.reload();
        }
      } catch (error) {
        console.error('Error recategorizing:', error);
        alert('Error during recategorization.');
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
      setLoading(true);
      try {
        const response = await fetch('/api/transactions', { method: 'DELETE' });
        if (response.ok) {
          alert('All data has been deleted.');
          window.location.reload();
        }
      } catch (error) {
        console.error('Error deleting data:', error);
        alert('Error during data deletion.');
      } finally {
        setLoading(false);
      }
    }
  };

  const navigationItems = [
    {
      href: '/dashboard/overview',
      label: 'Overview',
      icon: BarChart3,
      description: 'General financial overview'
    },
    {
      href: '/dashboard/advanced',
      label: 'Advanced',
      icon: TrendingUp,
      description: 'Deep dive analytics'
    },
    {
      href: '/dashboard/intelligent',
      label: 'Intelligent',
      icon: Brain,
      description: 'AI-powered analysis'
    },
    {
      href: '/dashboard/insights',
      label: 'AI Insights',
      icon: Lightbulb,
      description: 'Personalized recommendations'
    },
    {
      href: '/dashboard/categories',
      label: 'Categories',
      icon: Tag,
      description: 'Manage transaction categories'
    },
  ];

  return (
    <AmountVisibilityProvider>
      <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border shadow-lg fixed left-0 top-0 h-full z-40 lg:translate-x-0 transform -translate-x-full transition-transform duration-300 ease-in-out" id="sidebar">
        <div className="p-6">
          {/* Brand */}
          <Link href="/dashboard/overview" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <Wallet className="h-8 w-8 text-sidebar-primary" />
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">pFinance Lab</h1>
              <p className="text-xs text-muted-foreground">Advanced Analytics</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="space-y-2 mb-6">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div>
                    <div>{item.label}</div>
                    {!isActive && (
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="border-t border-sidebar-border pt-4 space-y-2">
            <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider mb-2">Quick Actions</h3>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData} 
              disabled={loading}
              className="w-full justify-start text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>

            <Button 
              variant="secondary" 
              size="sm" 
              onClick={recategorizeTransactions} 
              disabled={loading}
              className="w-full justify-start text-xs"
            >
              <Tag className="h-3 w-3 mr-2" />
              Recategorize
            </Button>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={clearAllData} 
              disabled={loading}
              className="w-full justify-start text-xs"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Amount Visibility Toggle - Bottom of Sidebar */}
          <div className="border-t border-sidebar-border pt-4 mt-4">
            <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider mb-3">Privacy</h3>
            <AmountVisibilityToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="border-b border-border bg-sidebar/50 backdrop-blur sticky top-0 z-30 shadow-sm">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button 
                  className="lg:hidden p-1 text-foreground"
                  onClick={() => {
                    const sidebar = document.getElementById('sidebar');
                    sidebar?.classList.toggle('-translate-x-full');
                  }}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-foreground">
                    {pathname === '/dashboard/overview' && 'Overview Dashboard'}
                    {pathname === '/dashboard/advanced' && 'Advanced Analytics'}
                    {pathname === '/dashboard/intelligent' && 'Intelligent Analysis'}
                    {pathname === '/dashboard/insights' && 'AI Insights'}
                    {pathname === '/dashboard/categories' && 'Categories Management'}
                  </h2>
                  <p className="text-xs lg:text-sm text-muted-foreground sm:block">
                    {pathname === '/dashboard/overview' && 'General financial overview and statistics'}
                    {pathname === '/dashboard/advanced' && 'Deep dive charts and advanced analytics'}
                    {pathname === '/dashboard/intelligent' && 'AI-powered pattern recognition and analysis'}
                    {pathname === '/dashboard/insights' && 'Personalized recommendations and actionable insights'}
                    {pathname === '/dashboard/categories' && 'Manage transaction categories and rules'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs flex"
                  onClick={() => document.getElementById('header-file-upload')?.click()}
                  disabled={loading}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Data
                </Button>
                <input
                  id="header-file-upload"
                  type="file"
                  accept=".csv,.pdf,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Redirect to overview page and trigger file upload
                      window.location.href = '/dashboard/overview?upload=true';
                      // Store file in sessionStorage for the overview page to pick up
                      const reader = new FileReader();
                      reader.onload = () => {
                        let content: string;
                        if (file.name.endsWith('.pdf') || file.name.match(/\.(xlsx|xls)$/i)) {
                          // Convert ArrayBuffer to base64 string for storage
                          const buffer = reader.result as ArrayBuffer;
                          const bytes = new Uint8Array(buffer);
                          let binary = '';
                          for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                          }
                          content = btoa(binary);
                        } else {
                          content = reader.result as string;
                        }
                        
                        sessionStorage.setItem('pendingUpload', JSON.stringify({
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          content: content,
                          isBase64: file.name.endsWith('.pdf') || file.name.match(/\.(xlsx|xls)$/i)
                        }));
                      };
                      if (file.name.endsWith('.pdf') || file.name.match(/\.(xlsx|xls)$/i)) {
                        reader.readAsArrayBuffer(file);
                      } else {
                        reader.readAsText(file);
                      }
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>

        {/* Global Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border p-6 rounded shadow-lg">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm">Processing...</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </AmountVisibilityProvider>
  );
}