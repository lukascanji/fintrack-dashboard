import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { ArrowRight, Layers, Layers2, Calendar } from 'lucide-react';
import { useEnrichedTransactions } from '../hooks/useEnrichedTransactions';
import { categoryColors } from '../utils/categorize';
import { filterByDateRange } from './DateRangeFilter';
import './SankeyFlow.css';

// Source colors for income nodes
const sourceColors = {
    'Salary': '#22c55e',
    'Payroll': '#22c55e',
    'Freelance': '#059669',
    'E-Transfer In': '#34d399',
    'Tax Refund': '#4ade80',
    'Other Income': '#86efac'
};

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Build Sankey data from transactions
// expandedCategories: Set of category names that should show merchant breakdown
// If null, show all merchants. If empty Set, collapse all.
function buildSankeyData(transactions, expandedCategories = null) {
    if (!transactions || transactions.length === 0) {
        return { nodes: [], links: [], stats: { income: 0, expenses: 0, net: 0, largestCategory: null } };
    }

    const nodes = [];
    const links = [];
    const nodeMap = {};
    let nodeIndex = 0;

    const getNodeIndex = (name, group, sortOrder = 0, totalValue = 0) => {
        const key = `${group}:${name}`;
        if (nodeMap[key] === undefined) {
            nodeMap[key] = nodeIndex++;
            nodes.push({ name, group, sortOrder, totalValue });
        } else {
            // Update totalValue if needed
            const existingNode = nodes[nodeMap[key]];
            if (totalValue > existingNode.totalValue) {
                existingNode.totalValue = totalValue;
            }
        }
        return nodeMap[key];
    };

    // Aggregate income by source
    const incomeBySource = {};
    const expensesByCategory = {};
    const merchantsByCategory = {};

    transactions.forEach(t => {
        const amount = t.credit > 0 ? t.credit : t.debit;

        if (t.credit > 0) {
            // Income
            const source = t.category === 'INCOME' ? t.merchant :
                t.category === 'TRANSFER' && t.credit > 0 ? 'Transfer In' : 'Other Income';
            incomeBySource[source] = (incomeBySource[source] || 0) + t.credit;
        } else if (t.debit > 0) {
            // Expense - include transfers as "TRANSFER OUT" category
            const category = t.category === 'TRANSFER' ? 'TRANSFER OUT' : (t.category || 'OTHER');
            expensesByCategory[category] = (expensesByCategory[category] || 0) + t.debit;

            // Track merchants within category
            if (!merchantsByCategory[category]) {
                merchantsByCategory[category] = {};
            }
            const merchant = t.effectiveMerchant || t.merchant || 'Unknown';
            merchantsByCategory[category][merchant] = (merchantsByCategory[category][merchant] || 0) + t.debit;
        }
    });

    // Calculate stats
    const totalIncome = Object.values(incomeBySource).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
    const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
    const largestCategory = sortedCategories[0] || null;

    // Create Total Income central node (sortOrder 0 for income side)
    const totalIncomeIdx = getNodeIndex('Total Income', 'income-total', 0, totalIncome);

    // Income sources -> Total Income (sorted by amount)
    const sortedIncomeSources = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);
    sortedIncomeSources.forEach(([source, amount], idx) => {
        if (amount > 0) {
            const sourceIdx = getNodeIndex(source, 'income-source', idx, amount);
            links.push({
                source: sourceIdx,
                target: totalIncomeIdx,
                value: amount,
                sourceName: source,
                targetName: 'Total Income'
            });
        }
    });

    // Total Income -> Categories (use sortedCategories for consistent order)
    sortedCategories.forEach(([category, total], categoryIndex) => {
        if (total > 0) {
            // Use categoryIndex for sortOrder so larger categories are positioned first
            const catIdx = getNodeIndex(category, 'category', categoryIndex, total);
            links.push({
                source: totalIncomeIdx,
                target: catIdx,
                value: total,
                sourceName: 'Total Income',
                targetName: category
            });

            // Only show merchant breakdown if this category is expanded
            // If expandedCategories is null, show all. Otherwise check if category is in set.
            const showMerchantsForCategory = expandedCategories === null || expandedCategories.has(category);
            if (showMerchantsForCategory) {
                // Categories -> Top merchants (limit to top 5 per category)
                const merchants = merchantsByCategory[category] || {};
                const sortedMerchants = Object.entries(merchants)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                // Merchant sortOrder: category index * 100 + merchant index within category
                sortedMerchants.forEach(([merchant, amount], merchantIndex) => {
                    const merchantSortOrder = categoryIndex * 100 + merchantIndex;
                    const merchantIdx = getNodeIndex(merchant, 'merchant', merchantSortOrder, amount);
                    links.push({
                        source: catIdx,
                        target: merchantIdx,
                        value: amount,
                        sourceName: category,
                        targetName: merchant
                    });
                });

                // Add "Other" for remaining merchants
                const topTotal = sortedMerchants.reduce((sum, [, amt]) => sum + amt, 0);
                const remaining = total - topTotal;
                if (remaining > 0) {
                    const otherSortOrder = categoryIndex * 100 + 99; // Put "Other" at end of category
                    const otherIdx = getNodeIndex(`Other ${category}`, 'merchant', otherSortOrder, remaining);
                    links.push({
                        source: catIdx,
                        target: otherIdx,
                        value: remaining,
                        sourceName: category,
                        targetName: `Other ${category}`
                    });
                }
            }
        }
    });

    return {
        nodes,
        links,
        stats: {
            income: totalIncome,
            expenses: totalExpenses,
            net: totalIncome - totalExpenses,
            largestCategory
        }
    };
}

// Get node color based on group
function getNodeColor(node) {
    if (node.group === 'income-source') {
        return sourceColors[node.name] || '#22c55e';
    }
    if (node.group === 'income-total') {
        return '#22c55e';
    }
    if (node.group === 'category') {
        return categoryColors[node.name] || '#71717a';
    }
    // Merchants get a muted color
    return '#94a3b8';
}

export default function SankeyFlow({ onNavigateToTransactions }) {
    const { transactions } = useEnrichedTransactions();
    const [period, setPeriod] = useState('last6Months');
    const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
    const [showCustomDates, setShowCustomDates] = useState(false);
    // null = show all merchants (detailed), empty Set = show no merchants (summary)
    // Set with categories = show those specific categories' merchants
    const [expandedCategories, setExpandedCategories] = useState(null);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const tooltipRef = useRef(null);

    // Filter transactions by either preset or custom date range
    const filteredTransactions = useMemo(() => {
        if (showCustomDates && customDateRange.start && customDateRange.end) {
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            endDate.setHours(23, 59, 59, 999); // Include entire end day
            return transactions.filter(t => t.date >= startDate && t.date <= endDate);
        }
        return filterByDateRange(transactions, period);
    }, [transactions, period, showCustomDates, customDateRange]);

    // Get all categories for expand/collapse logic
    const allCategories = useMemo(() => {
        const cats = new Set();
        filteredTransactions.forEach(t => {
            if (t.debit > 0 && t.category !== 'TRANSFER') {
                cats.add(t.category || 'OTHER');
            }
        });
        return cats;
    }, [filteredTransactions]);

    const sankeyData = useMemo(() =>
        buildSankeyData(filteredTransactions, expandedCategories),
        [filteredTransactions, expandedCategories]
    );

    // Toggle expand/collapse for a specific category
    const toggleCategory = useCallback((category) => {
        setExpandedCategories(prev => {
            if (prev === null) {
                // Currently showing all - collapse this one category
                const newSet = new Set(allCategories);
                newSet.delete(category);
                return newSet;
            } else if (prev.has(category)) {
                // Category is expanded - collapse it
                const newSet = new Set(prev);
                newSet.delete(category);
                return newSet;
            } else {
                // Category is collapsed - expand it
                const newSet = new Set(prev);
                newSet.add(category);
                return newSet;
            }
        });
    }, [allCategories]);

    // Check if all categories are expanded (for the toggle button)
    const isAllExpanded = expandedCategories === null ||
        (expandedCategories.size === allCategories.size &&
            [...allCategories].every(c => expandedCategories.has(c)));

    // Toggle all categories
    const toggleAll = useCallback(() => {
        if (isAllExpanded) {
            setExpandedCategories(new Set()); // Collapse all
        } else {
            setExpandedCategories(null); // Expand all
        }
    }, [isAllExpanded]);

    // Tooltip handlers
    const showTooltip = useCallback((event, title, rows) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        tooltip.innerHTML = `
            <div class="sankey-tooltip-title">${title}</div>
            ${rows.map(([label, value]) => `
                <div class="sankey-tooltip-row">
                    <span class="sankey-tooltip-label">${label}</span>
                    <span class="sankey-tooltip-value">${value}</span>
                </div>
            `).join('')}
        `;

        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY - 12}px`;
        tooltip.classList.add('visible');
    }, []);

    const hideTooltip = useCallback(() => {
        const tooltip = tooltipRef.current;
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }, []);

    // Render Sankey diagram
    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;
        if (sankeyData.nodes.length === 0) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        const margin = { top: 20, right: 180, bottom: 20, left: 20 };
        const width = rect.width - margin.left - margin.right;
        const height = rect.height - margin.top - margin.bottom;

        // Clear previous
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', rect.width)
            .attr('height', rect.height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create sankey generator with nodeSort to maintain stable positions
        const sankey = d3Sankey()
            .nodeWidth(20)
            .nodePadding(12)
            .nodeAlign(sankeyLeft)
            .nodeSort((a, b) => {
                // Sort by group first (income nodes, then categories, then merchants)
                const groupOrder = { 'income-source': 0, 'income-total': 1, 'category': 2, 'merchant': 3 };
                if (groupOrder[a.group] !== groupOrder[b.group]) {
                    return groupOrder[a.group] - groupOrder[b.group];
                }
                // Within same group, sort by sortOrder (based on total values)
                return a.sortOrder - b.sortOrder;
            })
            .extent([[0, 0], [width, height]]);

        // Prepare data - ensure nodes have index property
        const nodesCopy = sankeyData.nodes.map((d, i) => ({ ...d, index: i }));
        const linksCopy = sankeyData.links.map(d => ({
            ...d,
            source: d.source,
            target: d.target
        }));

        // Generate sankey layout
        const graph = sankey({
            nodes: nodesCopy,
            links: linksCopy
        });

        // Draw links
        g.append('g')
            .attr('class', 'sankey-links')
            .selectAll('path')
            .data(graph.links)
            .join('path')
            .attr('class', 'sankey-link')
            .attr('d', sankeyLinkHorizontal())
            .attr('stroke', d => getNodeColor(graph.nodes[d.source.index]))
            .attr('stroke-width', d => Math.max(1, d.width))
            .on('mouseenter', (event, d) => {
                showTooltip(event, `${d.sourceName} → ${d.targetName}`, [
                    ['Flow', formatCurrency(d.value)]
                ]);
            })
            .on('mousemove', (event) => {
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.left = `${event.clientX + 12}px`;
                    tooltip.style.top = `${event.clientY - 12}px`;
                }
            })
            .on('mouseleave', hideTooltip)
            .on('click', (event, d) => {
                if (onNavigateToTransactions) {
                    // Determine filters based on the link
                    const filters = { period };

                    // Income source -> Total Income link
                    if (d.source && d.source.group === 'income-source' && d.target && d.target.group === 'income-total') {
                        filters.type = 'income';
                        // For specific income sources (not synthetic ones), also search by name
                        if (d.sourceName !== 'E-Transfer In' && d.sourceName !== 'Other Income') {
                            filters.search = d.sourceName;
                        }
                        // For E-Transfer In, filter by TRANSFER category
                        else if (d.sourceName === 'E-Transfer In') {
                            filters.category = 'TRANSFER';
                        }
                        // For Other Income, exclude INCOME and TRANSFER categories
                        else if (d.sourceName === 'Other Income') {
                            filters.excludeCategories = ['INCOME', 'TRANSFER'];
                        }
                    }
                    // Total Income -> Category link
                    else if (d.source && d.source.group === 'income-total' && d.target && d.target.group === 'category') {
                        filters.category = d.targetName;
                    }
                    // Category -> Merchant link
                    else if (d.source && d.source.group === 'category' && d.target && d.target.group === 'merchant') {
                        filters.category = d.sourceName;
                        // Clean up "Other CATEGORY" merchant names
                        if (!d.targetName.startsWith('Other ')) {
                            filters.search = d.targetName;
                        }
                    }

                    onNavigateToTransactions(filters);
                }
            })
            .style('cursor', onNavigateToTransactions ? 'pointer' : 'default');

        // Draw nodes
        const node = g.append('g')
            .attr('class', 'sankey-nodes')
            .selectAll('g')
            .data(graph.nodes)
            .join('g')
            .attr('class', 'sankey-node');

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => getNodeColor(d))
            .attr('rx', 3)
            .on('mouseenter', (event, d) => {
                const total = d.value || 0;
                showTooltip(event, d.name, [
                    ['Total', formatCurrency(total)],
                    ['Type', d.group.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())]
                ]);
            })
            .on('mousemove', (event) => {
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.left = `${event.clientX + 12}px`;
                    tooltip.style.top = `${event.clientY - 12}px`;
                }
            })
            .on('mouseleave', hideTooltip)
            .on('click', (event, d) => {
                // Category node - toggle expand/collapse for this category
                if (d.group === 'category') {
                    toggleCategory(d.name);
                    return;
                }

                // Other nodes navigate to transactions
                if (onNavigateToTransactions) {
                    const filters = { period };

                    // Merchant node - search by merchant name
                    if (d.group === 'merchant') {
                        // Clean up "Other CATEGORY" merchant names
                        if (!d.name.startsWith('Other ')) {
                            filters.search = d.name;
                        }
                    }
                    // Income nodes - filter to show income transactions
                    else if (d.group === 'income-source' || d.group === 'income-total') {
                        filters.type = 'income';
                        // For specific income sources (not synthetic ones), also search by name
                        if (d.group === 'income-source' && d.name !== 'E-Transfer In' && d.name !== 'Other Income') {
                            filters.search = d.name;
                        }
                        // For E-Transfer In, filter by TRANSFER category
                        else if (d.name === 'E-Transfer In') {
                            filters.category = 'TRANSFER';
                        }
                        // For Other Income, exclude INCOME and TRANSFER categories
                        else if (d.name === 'Other Income') {
                            filters.excludeCategories = ['INCOME', 'TRANSFER'];
                        }
                    }

                    onNavigateToTransactions(filters);
                }
            })
            .style('cursor', 'pointer');

        // Add labels
        node.append('text')
            .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
            .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name)
            .style('font-size', '11px')
            .style('fill', 'var(--text-primary)');

    }, [sankeyData, showTooltip, hideTooltip, onNavigateToTransactions, period, toggleCategory]);

    const periodOptions = [
        { value: 'thisMonth', label: '1M' },
        { value: 'last3Months', label: '3M' },
        { value: 'last6Months', label: '6M' },
        { value: 'thisYear', label: '1Y' },
        { value: 'all', label: 'All' }
    ];

    const { stats } = sankeyData;
    const savingsRate = stats.income > 0 ? ((stats.net / stats.income) * 100).toFixed(1) : 0;

    return (
        <div className="sankey-container">
            {/* Stats Grid */}
            <div className="sankey-stats-grid">
                <div className="sankey-stat-card">
                    <div className="sankey-stat-label">Total Income</div>
                    <div className="sankey-stat-value positive">{formatCurrency(stats.income)}</div>
                    <div className="sankey-stat-meta">
                        {sankeyData.nodes.filter(n => n.group === 'income-source').length} sources
                    </div>
                </div>
                <div className="sankey-stat-card">
                    <div className="sankey-stat-label">Total Expenses</div>
                    <div className="sankey-stat-value negative">{formatCurrency(stats.expenses)}</div>
                    <div className="sankey-stat-meta">
                        {sankeyData.nodes.filter(n => n.group === 'category').length} categories
                    </div>
                </div>
                <div className="sankey-stat-card">
                    <div className="sankey-stat-label">Net Cash Flow</div>
                    <div className={`sankey-stat-value ${stats.net >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(Math.abs(stats.net))}
                    </div>
                    <div className="sankey-stat-meta">savings rate: {savingsRate}%</div>
                </div>
                <div className="sankey-stat-card">
                    <div className="sankey-stat-label">Largest Category</div>
                    <div className="sankey-stat-value">
                        {stats.largestCategory ? stats.largestCategory[0] : '-'}
                    </div>
                    <div className="sankey-stat-meta">
                        {stats.largestCategory ? formatCurrency(stats.largestCategory[1]) : '$0'}
                    </div>
                </div>
            </div>

            {/* Chart Card */}
            <div className="sankey-chart-card">
                <div className="sankey-chart-header">
                    <div>
                        <div className="sankey-chart-title">Money Flow Diagram</div>
                        <div className="sankey-chart-subtitle">
                            Visualizing how money moves through your accounts
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="sankey-total-badges">
                            <div className="sankey-total-badge">
                                <span className="sankey-total-badge-label">Income</span>
                                <span className="sankey-total-badge-value income">
                                    {formatCurrency(stats.income)}
                                </span>
                            </div>
                            <div className="sankey-total-badge">
                                <span className="sankey-total-badge-label">Expenses</span>
                                <span className="sankey-total-badge-value expenses">
                                    {formatCurrency(stats.expenses)}
                                </span>
                            </div>
                        </div>
                        <button
                            className={`sankey-detail-toggle ${isAllExpanded ? 'expanded' : ''}`}
                            onClick={toggleAll}
                            title={isAllExpanded ? 'Collapse all to categories' : 'Expand all to show merchants'}
                        >
                            {isAllExpanded ? <Layers2 size={18} /> : <Layers size={18} />}
                            {isAllExpanded ? 'Detailed' : 'Summary'}
                        </button>
                        <div className="sankey-period-selector">
                            {periodOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`sankey-period-btn ${!showCustomDates && period === opt.value ? 'active' : ''}`}
                                    onClick={() => {
                                        setPeriod(opt.value);
                                        setShowCustomDates(false);
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button
                                className={`sankey-period-btn ${showCustomDates ? 'active' : ''}`}
                                onClick={() => setShowCustomDates(!showCustomDates)}
                                title="Custom date range"
                            >
                                <Calendar size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {showCustomDates && (
                    <div className="sankey-custom-dates-row">
                        <span className="sankey-custom-dates-label">Custom Range:</span>
                        <input
                            type="date"
                            value={customDateRange.start || ''}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="sankey-date-input"
                        />
                        <span className="sankey-date-separator">to</span>
                        <input
                            type="date"
                            value={customDateRange.end || ''}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="sankey-date-input"
                        />
                    </div>
                )}

                <div className="sankey-flow-direction">
                    <ArrowRight size={20} />
                    <span>Income Sources → Categories {isAllExpanded ? '→ Merchants' : '(click category to expand)'}</span>
                </div>
            </div>

            <div className="sankey-svg-container" ref={containerRef}>
                <svg ref={svgRef}></svg>
            </div>

            {/* Legend */}
            <div className="sankey-legend">
                <div className="sankey-legend-item">
                    <div className="sankey-legend-color" style={{ background: '#22c55e' }}></div>
                    <span>Income</span>
                </div>
                {Object.entries(categoryColors).map(([category, color]) => (
                    <div key={category} className="sankey-legend-item">
                        <div className="sankey-legend-color" style={{ background: color }}></div>
                        <span>{category}</span>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            <div className="sankey-tooltip" ref={tooltipRef}></div>
        </div>
    );
}
