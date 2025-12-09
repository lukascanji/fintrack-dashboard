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

export default function SpendingChart({ monthlyData }) {
    if (!monthlyData || monthlyData.length === 0) return null;

    const data = {
        labels: monthlyData.map(m => m.month),
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

    const options = {
        responsive: true,
        maintainAspectRatio: false,
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
                    }
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
