import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function SpendingChart({ monthlyData, onNavigateToTransactions }) {
    if (!monthlyData || monthlyData.length === 0) return null;

    // Format month label for display (e.g., "2024-12" -> "Dec 2024")
    const formatMonthLabel = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    const data = {
        labels: monthlyData.map(m => formatMonthLabel(m.month)),
        datasets: [
            {
                label: 'Income',
                data: monthlyData.map(m => m.income),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Expenses',
                data: monthlyData.map(m => m.expenses),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1,
                borderRadius: 4,
            }
        ]
    };

    // Handle click on bar to navigate to transactions for that month
    const handleClick = (event, elements) => {
        if (!onNavigateToTransactions || elements.length === 0) return;

        const element = elements[0];
        const monthKey = monthlyData[element.index].month; // e.g., "2024-12"
        const datasetIndex = element.datasetIndex; // 0 = Income, 1 = Expenses

        // Parse the month key (YYYY-MM format)
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1; // 0-indexed

        if (isNaN(year) || isNaN(monthIndex)) return;

        // Create start and end dates for the month
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0); // Last day of month

        const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

        const filters = {
            period: 'custom',
            customDates: {
                start: formatDate(startDate),
                end: formatDate(endDate)
            },
            type: datasetIndex === 0 ? 'income' : 'spending'
        };

        onNavigateToTransactions(filters);
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleClick,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#a0a0b0',
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, family: 'Inter' }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#a0a0b0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: (context) => {
                        return ` ${context.dataset.label}: $${context.raw.toLocaleString()}`;
                    },
                    footer: () => 'Click to view transactions'
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#a0a0b0', font: { size: 11 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    color: '#a0a0b0',
                    font: { size: 11 },
                    callback: (value) => `$${value.toLocaleString()}`
                }
            }
        },
        // Add cursor pointer on hover
        onHover: (event, elements) => {
            event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
    };

    return (
        <div className="card">
            <div className="card-title">Monthly Cash Flow</div>
            <div style={{ height: '300px' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}
