// Performance monitoring for quiz load testing
// Run this in browser console during testing

class QuizPerformanceMonitor {
  constructor() {
    this.metrics = {
      participantCount: 0,
      connectionErrors: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      networkErrors: [],
      lastUpdate: null
    };
    
    this.startTime = Date.now();
    this.isMonitoring = false;
  }
  
  start() {
    if (this.isMonitoring) return;
    
    console.log('🚀 Starting Quiz Performance Monitor...');
    this.isMonitoring = true;
    
    // Monitor every 5 seconds
    this.interval = setInterval(() => {
      this.collectMetrics();
      this.displayMetrics();
    }, 5000);
    
    // Listen for network errors
    this.setupErrorMonitoring();
  }
  
  stop() {
    if (!this.isMonitoring) return;
    
    clearInterval(this.interval);
    this.isMonitoring = false;
    console.log('⏹️ Performance monitoring stopped');
  }
  
  collectMetrics() {
    // Memory usage
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    
    // Network timing
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.metrics.avgResponseTime = Math.round(navigation.responseEnd - navigation.responseStart);
    }
    
    // Check for quiz-specific elements
    const participantElements = document.querySelectorAll('[data-testid="participant"], .participant-card, .participant-item');
    this.metrics.participantCount = participantElements.length;
    
    this.metrics.lastUpdate = new Date().toLocaleTimeString();
  }
  
  setupErrorMonitoring() {
    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.metrics.networkErrors.push({
            url: args[0],
            status: response.status,
            time: new Date().toLocaleTimeString()
          });
          this.metrics.connectionErrors++;
        }
        return response;
      } catch (error) {
        this.metrics.networkErrors.push({
          url: args[0],
          error: error.message,
          time: new Date().toLocaleTimeString()
        });
        this.metrics.connectionErrors++;
        throw error;
      }
    };
    
    // Monitor console errors
    const originalError = console.error;
    console.error = (...args) => {
      if (args.some(arg => String(arg).includes('Supabase') || String(arg).includes('real-time'))) {
        this.metrics.connectionErrors++;
      }
      originalError(...args);
    };
  }
  
  displayMetrics() {
    const runtime = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log(`
📊 QUIZ PERFORMANCE METRICS (Runtime: ${runtime}s)
┌─────────────────────────────────────────────────┐
│ 👥 Participants Visible: ${this.metrics.participantCount.toString().padStart(15)} │
│ 💾 Memory Usage (MB):    ${this.metrics.memoryUsage.toString().padStart(15)} │
│ ⚡ Avg Response (ms):    ${this.metrics.avgResponseTime.toString().padStart(15)} │
│ ❌ Connection Errors:    ${this.metrics.connectionErrors.toString().padStart(15)} │
│ 🕐 Last Update:         ${this.metrics.lastUpdate.padStart(15)} │
└─────────────────────────────────────────────────┘
    `);
    
    // Warning thresholds
    if (this.metrics.memoryUsage > 500) {
      console.warn('⚠️  HIGH MEMORY USAGE! Consider reducing participants.');
    }
    
    if (this.metrics.connectionErrors > 10) {
      console.error('🚨 HIGH ERROR RATE! System may be overloaded.');
    }
    
    if (this.metrics.avgResponseTime > 5000) {
      console.warn('⚠️  SLOW RESPONSE TIME! Network may be congested.');
    }
    
    // Show recent errors
    const recentErrors = this.metrics.networkErrors.slice(-3);
    if (recentErrors.length > 0) {
      console.log('Recent Errors:', recentErrors);
    }
  }
  
  generateReport() {
    const runtime = Math.round((Date.now() - this.startTime) / 1000);
    
    return {
      testDuration: `${runtime} seconds`,
      peakParticipants: this.metrics.participantCount,
      peakMemory: `${this.metrics.memoryUsage} MB`,
      totalErrors: this.metrics.connectionErrors,
      avgResponseTime: `${this.metrics.avgResponseTime} ms`,
      recommendation: this.getRecommendation()
    };
  }
  
  getRecommendation() {
    if (this.metrics.connectionErrors > 20) {
      return '🚨 CRITICAL: System overloaded. Reduce participants or implement backend.';
    } else if (this.metrics.memoryUsage > 800) {
      return '⚠️  WARNING: High memory usage. Monitor closely or scale infrastructure.';
    } else if (this.metrics.connectionErrors > 5) {
      return '⚠️  CAUTION: Some errors detected. System stressed but functional.';
    } else {
      return '✅ STABLE: System performing well at current load.';
    }
  }
}

// Usage instructions
console.log(`
🎯 QUIZ LOAD TESTING MONITOR
─────────────────────────────

Usage:
const monitor = new QuizPerformanceMonitor();
monitor.start();

// Run your load test, then:
monitor.stop();
console.log(monitor.generateReport());

🔍 What to watch for:
• Memory usage > 500MB = Warning
• Connection errors > 10 = Critical  
• Response time > 5s = Network issues
• Browser freezing/crashing = Overload
`);

// Auto-start if we're in a quiz page
if (window.location.href.includes('quiz') || window.location.href.includes('participant')) {
  console.log('🚀 Auto-starting monitor on quiz page...');
  window.quizMonitor = new QuizPerformanceMonitor();
  // Uncomment to auto-start:
  // window.quizMonitor.start();
} 