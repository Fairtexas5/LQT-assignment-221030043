// Dashboard Application JavaScript
class SustainabilityDashboard {
    constructor() {
        this.data = {
            company: {
                name: "EcoTextile Manufacturing",
                logo: "🌱",
                sustainability_score: 78,
                last_updated: "2025-08-24T21:55:00Z"
            },
            kpi_data: {
                energy: {
                    current: 1247.5,
                    unit: "kWh",
                    target: 1200,
                    status: "warning",
                    trend: [1300, 1285, 1260, 1245, 1247.5],
                    change_percent: -4.2,
                    cost_impact: 2847.50
                },
                water: {
                    current: 8450,
                    unit: "liters",
                    target: 8000,
                    status: "warning",
                    recycling_rate: 67,
                    trend: [8800, 8650, 8520, 8480, 8450],
                    change_percent: -3.9,
                    cost_impact: 1689.00
                },
                waste: {
                    current: 125.3,
                    unit: "kg",
                    target: 100,
                    status: "critical",
                    recycling_rate: 82,
                    trend: [140, 135, 130, 127, 125.3],
                    change_percent: -10.5,
                    cost_impact: 1567.75
                },
                emissions: {
                    current: 45.7,
                    unit: "tonnes CO2eq",
                    target: 40,
                    status: "warning",
                    reduction_percent: 12.3,
                    trend: [52, 50, 48, 46, 45.7],
                    change_percent: -12.1,
                    cost_impact: 3423.50
                }
            },
            historical_data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
                energy: [1350, 1320, 1300, 1285, 1270, 1260, 1250, 1247.5],
                water: [9200, 9000, 8800, 8650, 8600, 8520, 8480, 8450],
                waste: [150, 145, 140, 135, 132, 130, 127, 125.3],
                emissions: [55, 53, 52, 50, 48, 47, 46, 45.7]
            }
        };

        this.charts = {};
        this.currentInsight = null;
        this.alertCount = 4;
        
        this.init();
    }

    init() {
        this.updateDateTime();
        this.setupEventListeners();
        this.createMiniCharts();
        this.createRadarChart();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    updateDateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // KPI tile clicks with event delegation to prevent conflicts
            const kpiGrid = document.querySelector('.kpi-grid');
            if (kpiGrid) {
                kpiGrid.addEventListener('click', (e) => {
                    const kpiTile = e.target.closest('.kpi-tile');
                    if (kpiTile) {
                        e.preventDefault();
                        e.stopPropagation();
                        const kpiType = kpiTile.dataset.kpi;
                        if (kpiType && kpiType !== 'overall') {
                            this.showInsights(kpiType);
                        }
                    }
                });
            }

            // Close insights
            const closeInsightsBtn = document.getElementById('close-insights');
            if (closeInsightsBtn) {
                closeInsightsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideInsights();
                });
            }

            // Notifications toggle
            const notificationsBtn = document.getElementById('notifications-btn');
            if (notificationsBtn) {
                notificationsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleNotifications();
                });
            }

            const closeNotificationsBtn = document.getElementById('close-notifications');
            if (closeNotificationsBtn) {
                closeNotificationsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideNotifications();
                });
            }

            // Alert dismiss buttons
            document.querySelectorAll('.alert__dismiss').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.dismissAlert(e.target.closest('.alert'));
                });
            });

            // Filter changes
            document.querySelectorAll('.filter-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    this.applyFilters();
                });
            });

            // Reset filters
            const resetFiltersBtn = document.getElementById('reset-filters');
            if (resetFiltersBtn) {
                resetFiltersBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.resetFilters();
                });
            }

            // Export buttons
            const exportPdfBtn = document.getElementById('export-pdf');
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.exportData('pdf');
                });
            }

            const exportCsvBtn = document.getElementById('export-csv');
            if (exportCsvBtn) {
                exportCsvBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.exportData('csv');
                });
            }

            const exportExcelBtn = document.getElementById('export-excel');
            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.exportData('excel');
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.refreshData();
                });
            }
        }, 100);
    }

    createMiniCharts() {
        const energyChartContainer = document.getElementById('energy-mini-chart');
        if (energyChartContainer) {
            // Clear existing content
            energyChartContainer.innerHTML = '';
            
            const energyCanvas = document.createElement('canvas');
            energyChartContainer.appendChild(energyCanvas);
            
            this.charts.energyMini = new Chart(energyCanvas, {
                type: 'line',
                data: {
                    labels: ['', '', '', '', ''],
                    datasets: [{
                        data: this.data.kpi_data.energy.trend,
                        borderColor: '#1FB8CD',
                        backgroundColor: 'rgba(31, 184, 205, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    elements: {
                        point: { radius: 0 }
                    }
                }
            });
        }
    }

    createRadarChart() {
        const radarChartContainer = document.getElementById('overall-radar-chart');
        if (radarChartContainer) {
            // Clear existing content
            radarChartContainer.innerHTML = '';
            
            const radarCanvas = document.createElement('canvas');
            radarChartContainer.appendChild(radarCanvas);

            this.charts.radar = new Chart(radarCanvas, {
                type: 'radar',
                data: {
                    labels: ['Energy', 'Water', 'Waste', 'Emissions', 'Overall'],
                    datasets: [{
                        label: 'Current Performance',
                        data: [75, 72, 68, 76, 78],
                        fill: true,
                        backgroundColor: 'rgba(31, 184, 205, 0.2)',
                        borderColor: '#1FB8CD',
                        pointBackgroundColor: '#1FB8CD',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#1FB8CD'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { display: false },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            pointLabels: { font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }

    showInsights(kpiType) {
        const kpiData = this.data.kpi_data[kpiType];
        const historicalData = this.data.historical_data[kpiType];
        
        if (!kpiData || !historicalData) {
            console.error('KPI data not found for:', kpiType);
            return;
        }
        
        this.currentInsight = kpiType;
        
        // Update insights content
        const insightsTitle = document.getElementById('insights-title');
        const insightCurrent = document.getElementById('insight-current');
        const insightTarget = document.getElementById('insight-target');
        const insightCost = document.getElementById('insight-cost');
        const insightTrend = document.getElementById('insight-trend');
        
        if (insightsTitle) insightsTitle.textContent = `${this.getKpiTitle(kpiType)} - Detailed Insights`;
        if (insightCurrent) insightCurrent.textContent = `${kpiData.current} ${kpiData.unit}`;
        if (insightTarget) insightTarget.textContent = `${kpiData.target} ${kpiData.unit}`;
        if (insightCost) insightCost.textContent = `$${kpiData.cost_impact.toFixed(2)}`;
        if (insightTrend) insightTrend.textContent = `${kpiData.change_percent > 0 ? '+' : ''}${kpiData.change_percent}%`;

        // Create detailed chart
        this.createInsightChart(kpiType, historicalData);
        
        // Show insights section
        const insightsSection = document.getElementById('insights-section');
        if (insightsSection) {
            insightsSection.classList.remove('hidden');
            insightsSection.classList.add('fade-in');
            
            // Scroll to insights
            insightsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    createInsightChart(kpiType, data) {
        const canvas = document.getElementById('main-insight-chart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (this.charts.insight) {
            this.charts.insight.destroy();
        }

        this.charts.insight = new Chart(canvas, {
            type: 'line',
            data: {
                labels: this.data.historical_data.labels,
                datasets: [{
                    label: this.getKpiTitle(kpiType),
                    data: data,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Target',
                    data: new Array(data.length).fill(this.data.kpi_data[kpiType].target),
                    borderColor: '#DB4545',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: this.data.kpi_data[kpiType].unit
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    getKpiTitle(kpiType) {
        const titles = {
            energy: 'Energy Consumption',
            water: 'Water Usage',
            waste: 'Waste Management',
            emissions: 'Carbon Emissions'
        };
        return titles[kpiType] || kpiType;
    }

    hideInsights() {
        const insightsSection = document.getElementById('insights-section');
        if (insightsSection) {
            insightsSection.classList.add('hidden');
        }
        this.currentInsight = null;
    }

    toggleNotifications() {
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    hideNotifications() {
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    dismissAlert(alertElement) {
        if (!alertElement) return;
        
        alertElement.style.transition = 'all 0.3s ease';
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            alertElement.remove();
            this.alertCount = Math.max(0, this.alertCount - 1);
            this.updateNotificationBadge();
        }, 300);
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notifications-count');
        if (badge) {
            badge.textContent = this.alertCount;
            if (this.alertCount === 0) {
                badge.style.display = 'none';
            }
        }
    }

    applyFilters() {
        const timeFilter = document.getElementById('time-filter');
        const unitFilter = document.getElementById('unit-filter');
        const departmentFilter = document.getElementById('department-filter');
        const machineFilter = document.getElementById('machine-filter');
        const shiftFilter = document.getElementById('shift-filter');

        const filters = {
            time: timeFilter ? timeFilter.value : 'week',
            unit: unitFilter ? unitFilter.value : 'all',
            department: departmentFilter ? departmentFilter.value : 'all',
            machine: machineFilter ? machineFilter.value : 'all',
            shift: shiftFilter ? shiftFilter.value : 'all'
        };

        console.log('Filters applied:', filters);

        // Add loading state
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.classList.add('loading');
        }
        
        // Simulate filtering delay
        setTimeout(() => {
            this.updateDashboardData();
            if (dashboard) {
                dashboard.classList.remove('loading');
            }
        }, 800);
    }

    resetFilters() {
        const timeFilter = document.getElementById('time-filter');
        const unitFilter = document.getElementById('unit-filter');
        const departmentFilter = document.getElementById('department-filter');
        const machineFilter = document.getElementById('machine-filter');
        const shiftFilter = document.getElementById('shift-filter');
        
        if (timeFilter) timeFilter.selectedIndex = 1; // This Week
        if (unitFilter) unitFilter.selectedIndex = 0;
        if (departmentFilter) departmentFilter.selectedIndex = 0;
        if (machineFilter) machineFilter.selectedIndex = 0;
        if (shiftFilter) shiftFilter.selectedIndex = 0;
        
        this.applyFilters();
    }

    updateDashboardData() {
        // Simulate data variation based on filters
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        
        // Update KPI values with small variations
        Object.keys(this.data.kpi_data).forEach(kpiType => {
            const kpi = this.data.kpi_data[kpiType];
            const newValue = kpi.current * (1 + variation);
            
            // Update displayed value
            const tile = document.querySelector(`[data-kpi="${kpiType}"]`);
            if (tile) {
                const numberElement = tile.querySelector('.kpi-tile__number');
                if (numberElement) {
                    numberElement.textContent = this.formatNumber(newValue);
                }
            }
        });

        // Update charts if needed
        if (this.currentInsight) {
            setTimeout(() => {
                this.showInsights(this.currentInsight);
            }, 100);
        }
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (Math.round(num * 10) / 10).toLocaleString();
        }
        return Math.round(num * 10) / 10;
    }

    exportData(format) {
        const startDateInput = document.getElementById('export-start');
        const endDateInput = document.getElementById('export-end');
        
        const startDate = startDateInput ? startDateInput.value : '2025-01-01';
        const endDate = endDateInput ? endDateInput.value : '2025-08-24';
        
        console.log(`Exporting ${format.toUpperCase()} report from ${startDate} to ${endDate}`);
        
        // Simulate export process
        const exportBtn = document.querySelector(`#export-${format}`);
        if (!exportBtn) return;
        
        const originalText = exportBtn.textContent;
        
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        
        setTimeout(() => {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
            
            // Show success message
            this.showNotification(`${format.toUpperCase()} report exported successfully!`, 'success');
            
            // In a real application, this would trigger a download
            const data = this.prepareExportData(startDate, endDate);
            this.downloadFile(data, `sustainability-report-${startDate}-to-${endDate}.${format}`);
        }, 2000);
    }

    prepareExportData(startDate, endDate) {
        return {
            company: this.data.company.name,
            report_period: `${startDate} to ${endDate}`,
            kpi_data: this.data.kpi_data,
            historical_data: this.data.historical_data,
            generated_at: new Date().toISOString()
        };
    }

    downloadFile(data, filename) {
        // Simulate file download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'info') {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `alert alert--${type} fade-in`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div class="alert__header">
                <span class="alert__type">${type}</span>
                <span class="alert__time">Now</span>
            </div>
            <p class="alert__message">${message}</p>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    refreshData() {
        console.log('Refreshing dashboard data...');
        
        const refreshBtn = document.getElementById('refresh-btn');
        if (!refreshBtn) return;
        
        const originalText = refreshBtn.innerHTML;
        
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span>🔄</span> Refreshing...';
        refreshBtn.classList.add('loading');
        
        // Simulate data refresh
        setTimeout(() => {
            // Update last updated time
            this.data.company.last_updated = new Date().toISOString();
            this.updateDateTime();
            
            // Refresh current view
            this.updateDashboardData();
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalText;
            refreshBtn.classList.remove('loading');
            
            this.showNotification('Dashboard data refreshed successfully!', 'success');
        }, 1500);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new SustainabilityDashboard();
});

// Handle window resize for charts
window.addEventListener('resize', () => {
    if (window.dashboard && window.dashboard.charts) {
        Object.values(window.dashboard.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Escape key to close modals
    if (e.key === 'Escape') {
        if (window.dashboard) {
            const insightsSection = document.getElementById('insights-section');
            const notificationsPanel = document.getElementById('notifications-panel');
            
            if (insightsSection && !insightsSection.classList.contains('hidden')) {
                window.dashboard.hideInsights();
            }
            if (notificationsPanel && !notificationsPanel.classList.contains('hidden')) {
                window.dashboard.hideNotifications();
            }
        }
    }
});

// Add click outside to close notifications
document.addEventListener('click', (e) => {
    if (!window.dashboard) return;
    
    const notificationsPanel = document.getElementById('notifications-panel');
    const notificationsBtn = document.getElementById('notifications-btn');
    
    if (notificationsPanel && notificationsBtn && 
        !notificationsPanel.classList.contains('hidden') && 
        !notificationsPanel.contains(e.target) && 
        !notificationsBtn.contains(e.target)) {
        window.dashboard.hideNotifications();
    }
});