/**
 * Transformation Log - Event sourcing for recurring item changes
 * 
 * Tracks all transformations: imports, merges, splits, renames, reassignments, etc.
 * Provides audit trail and enables undo functionality.
 */

const TRANSFORMATION_LOG_KEY = 'fintrack_transformation_log';
const LOG_VERSION = 1;

/**
 * Event types for transformation logging
 */
export const EventTypes = {
    IMPORT_DATA: 'IMPORT_DATA',
    AUTO_DETECT: 'AUTO_DETECT',
    APPROVE: 'APPROVE',
    DENY: 'DENY',
    RENAME: 'RENAME',
    MERGE: 'MERGE',
    UNMERGE: 'UNMERGE',
    SPLIT: 'SPLIT',
    UNSPLIT: 'UNSPLIT',
    REASSIGN: 'REASSIGN',
    CATEGORIZE: 'CATEGORIZE',
    MANUAL_ADD: 'MANUAL_ADD',
    DELETE: 'DELETE',
    GAP_FILL: 'GAP_FILL'
};

/**
 * Event trigger sources
 */
export const TriggerSources = {
    SYSTEM: 'system',
    USER: 'user',
    SMART_SUGGESTION: 'smart_suggestion'
};

/**
 * Generate unique event ID
 */
function generateEventId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `evt_${timestamp}_${random}`;
}

/**
 * Get the transformation log from localStorage
 * @returns {Object} Log object with version and events array
 */
export function getEventLog() {
    try {
        const stored = localStorage.getItem(TRANSFORMATION_LOG_KEY);
        if (!stored) {
            return { version: LOG_VERSION, events: [], lastEventId: null };
        }
        const parsed = JSON.parse(stored);
        // Handle version migration if needed
        if (parsed.version !== LOG_VERSION) {
            console.warn('Transformation log version mismatch, may need migration');
        }
        return parsed;
    } catch (error) {
        console.error('Error reading transformation log:', error);
        return { version: LOG_VERSION, events: [], lastEventId: null };
    }
}

/**
 * Save the transformation log to localStorage
 * @param {Object} log - Log object to save
 */
function saveEventLog(log) {
    try {
        localStorage.setItem(TRANSFORMATION_LOG_KEY, JSON.stringify(log));
    } catch (error) {
        console.error('Error saving transformation log:', error);
        // If localStorage is full, try to prune old events
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, pruning old events');
            pruneOldEvents(log, 100); // Keep last 100 events
            localStorage.setItem(TRANSFORMATION_LOG_KEY, JSON.stringify(log));
        }
    }
}

/**
 * Prune old events to manage storage
 * @param {Object} log - Log object to prune
 * @param {number} keepCount - Number of recent events to keep
 */
function pruneOldEvents(log, keepCount) {
    if (log.events.length > keepCount) {
        log.events = log.events.slice(-keepCount);
    }
}

/**
 * Log a transformation event
 * @param {string} type - Event type from EventTypes
 * @param {Object} data - Event-specific data payload
 * @param {Object} options - Additional options
 * @param {string} options.triggeredBy - 'system' | 'user' | 'smart_suggestion'
 * @param {string[]} options.affectedKeys - merchantKeys affected by this event
 * @param {string} options.parentEventId - For cascading operations
 * @param {boolean} options.undoable - Whether this event can be undone (default true)
 * @returns {Object} The created event
 */
export function logEvent(type, data, options = {}) {
    const {
        triggeredBy = TriggerSources.USER,
        affectedKeys = [],
        parentEventId = null,
        undoable = true
    } = options;

    const event = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        type,
        triggeredBy,
        data,
        affectedKeys,
        parentEventId,
        undoable,
        undoneBy: null
    };

    const log = getEventLog();
    log.events.push(event);
    log.lastEventId = event.id;
    saveEventLog(log);

    // Debug logging
    console.log(`📝 Transformation logged: ${type}`, {
        id: event.id,
        triggeredBy,
        affectedKeys,
        data
    });

    return event;
}

/**
 * Get events for a specific merchantKey
 * @param {string} merchantKey - The key to filter by
 * @returns {Object[]} Array of events affecting this key
 */
export function getEventsByKey(merchantKey) {
    const log = getEventLog();
    return log.events.filter(event =>
        event.affectedKeys.includes(merchantKey)
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
}

/**
 * Get a specific event by ID
 * @param {string} eventId - Event ID to find
 * @returns {Object|null} The event or null if not found
 */
export function getEventById(eventId) {
    const log = getEventLog();
    return log.events.find(event => event.id === eventId) || null;
}

/**
 * Get events since a specific timestamp
 * @param {string|Date} since - Start timestamp
 * @returns {Object[]} Array of events since that time
 */
export function getEventsSince(since) {
    const sinceDate = since instanceof Date ? since : new Date(since);
    const log = getEventLog();
    return log.events.filter(event =>
        new Date(event.timestamp) >= sinceDate
    );
}

/**
 * Get the last N events
 * @param {number} count - Number of events to return
 * @returns {Object[]} Array of most recent events
 */
export function getRecentEvents(count = 10) {
    const log = getEventLog();
    return log.events.slice(-count).reverse(); // Newest first
}

/**
 * Get the last undoable event
 * @returns {Object|null} The last undoable event or null
 */
export function getLastUndoableEvent() {
    const log = getEventLog();
    // Find last event that is undoable and hasn't been undone
    for (let i = log.events.length - 1; i >= 0; i--) {
        const event = log.events[i];
        if (event.undoable && !event.undoneBy) {
            return event;
        }
    }
    return null;
}

/**
 * Find events that depend on a given event
 * (Events that affect the same keys and occurred after)
 * @param {string} eventId - The event ID to check dependencies for
 * @returns {Object[]} Array of dependent events
 */
export function findDependentEvents(eventId) {
    const log = getEventLog();
    const targetEvent = getEventById(eventId);

    if (!targetEvent) return [];

    return log.events.filter(event =>
        event.id !== eventId &&
        new Date(event.timestamp) > new Date(targetEvent.timestamp) &&
        event.affectedKeys.some(key => targetEvent.affectedKeys.includes(key)) &&
        !event.undoneBy
    );
}

/**
 * Mark an event as undone
 * @param {string} eventId - The event ID to mark as undone
 * @param {string} undoEventId - The ID of the undo event
 */
export function markEventAsUndone(eventId, undoEventId) {
    const log = getEventLog();
    const eventIndex = log.events.findIndex(e => e.id === eventId);

    if (eventIndex !== -1) {
        log.events[eventIndex].undoneBy = undoEventId;
        saveEventLog(log);
    }
}

/**
 * Get summary statistics for the log
 * @returns {Object} Summary stats
 */
export function getLogSummary() {
    const log = getEventLog();
    const typeCounts = {};

    log.events.forEach(event => {
        typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });

    return {
        totalEvents: log.events.length,
        lastEventId: log.lastEventId,
        eventsByType: typeCounts,
        oldestEvent: log.events[0]?.timestamp || null,
        newestEvent: log.events[log.events.length - 1]?.timestamp || null
    };
}

/**
 * Export the full log as JSON
 * @returns {string} JSON string of the log
 */
export function exportLog() {
    const log = getEventLog();
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        ...log
    }, null, 2);
}

/**
 * Clear the entire log (use with caution!)
 */
export function clearLog() {
    const emptyLog = { version: LOG_VERSION, events: [], lastEventId: null };
    saveEventLog(emptyLog);
    console.warn('⚠️ Transformation log cleared');
}

/**
 * Format an event for display
 * @param {Object} event - Event to format
 * @returns {Object} Formatted event with human-readable description
 */
export function formatEventForDisplay(event) {
    let description = '';
    let icon = '📝';
    let color = 'blue';

    switch (event.type) {
        case EventTypes.IMPORT_DATA:
            description = `Imported ${event.data.transactionCount || 'N/A'} transactions`;
            icon = '📥';
            color = 'green';
            break;
        case EventTypes.AUTO_DETECT:
            description = `Auto-detected ${event.data.count || 'N/A'} subscriptions`;
            icon = '🔍';
            color = 'green';
            break;
        case EventTypes.APPROVE:
            description = `Approved: ${event.data.merchant || event.data.merchantKey}`;
            icon = '✅';
            color = 'green';
            break;
        case EventTypes.DENY:
            description = `Denied: ${event.data.merchant || event.data.merchantKey}`;
            icon = '❌';
            color = 'red';
            break;
        case EventTypes.RENAME:
            description = `Renamed: "${event.data.fromName}" → "${event.data.toName}"`;
            icon = '✏️';
            color = 'blue';
            break;
        case EventTypes.MERGE:
            description = `Merged ${event.data.sourceKeys?.length || 2} items → ${event.data.displayName || 'merged item'}`;
            icon = '🔗';
            color = 'blue';
            break;
        case EventTypes.UNMERGE:
            description = `Unmerged: ${event.data.displayName || event.data.targetKey}`;
            icon = '🔓';
            color = 'red';
            break;
        case EventTypes.SPLIT:
            description = `Split: ${event.data.sourceKey} by ${event.data.splitBy}`;
            icon = '✂️';
            color = 'blue';
            break;
        case EventTypes.REASSIGN:
            description = `Moved transaction to ${event.data.toKey}`;
            icon = '↔️';
            color = 'orange';
            break;
        case EventTypes.CATEGORIZE:
            description = `Category: ${event.data.fromCategory} → ${event.data.toCategory}`;
            icon = '🏷️';
            color = 'blue';
            break;
        case EventTypes.MANUAL_ADD:
            description = `Added manual: ${event.data.merchant || event.data.merchantKey}`;
            icon = '➕';
            color = 'green';
            break;
        case EventTypes.DELETE:
            description = `Deleted: ${event.data.merchant || event.data.merchantKey}`;
            icon = '🗑️';
            color = 'red';
            break;
        case EventTypes.GAP_FILL:
            description = `Filled gap in ${event.data.subscription} from container`;
            icon = '🔧';
            color = 'orange';
            break;
        default:
            description = `${event.type}: ${JSON.stringify(event.data).substring(0, 50)}...`;
    }

    return {
        ...event,
        description,
        icon,
        color,
        formattedTime: new Date(event.timestamp).toLocaleString()
    };
}

/**
 * Get undo preview for an event (including cascade)
 * @param {string} eventId - Event ID to get undo preview for (optional, defaults to last undoable)
 * @returns {Object|null} Undo preview with primary and cascading events
 */
export function getUndoPreview(eventId = null) {
    const targetEvent = eventId
        ? getEventById(eventId)
        : getLastUndoableEvent();

    if (!targetEvent) return null;
    if (!targetEvent.undoable) return null;
    if (targetEvent.undoneBy) return null;

    const dependentEvents = findDependentEvents(targetEvent.id);
    const formattedTarget = formatEventForDisplay(targetEvent);
    const formattedDependents = dependentEvents.map(formatEventForDisplay);

    return {
        primaryEvent: formattedTarget,
        cascadingEvents: formattedDependents,
        totalUndoCount: 1 + dependentEvents.length,
        canUndo: true
    };
}

/**
 * Generate description for inverse operation
 * @param {Object} event - Original event
 * @returns {string} Description of what undo will do
 */
export function getInverseDescription(event) {
    switch (event.type) {
        case EventTypes.RENAME:
            return `Revert name: "${event.data.toName}" → "${event.data.fromName}"`;
        case EventTypes.MERGE:
            return `Unmerge: Separate ${event.data.displayName || 'items'} back to original`;
        case EventTypes.CATEGORIZE:
            return `Revert category: ${event.data.toCategory} → ${event.data.fromCategory}`;
        case EventTypes.APPROVE:
            return `Unapprove: Move ${event.data.merchant || event.data.merchantKey} back to pending`;
        case EventTypes.DENY:
            return `Un-deny: Move ${event.data.merchant || event.data.merchantKey} back to pending`;
        case EventTypes.REASSIGN:
            return `Reassign back: Move transaction from ${event.data.toKey} to ${event.data.fromKey}`;
        case EventTypes.GAP_FILL:
            return `Remove gap fill: Unassign transaction from ${event.data.subscription}`;
        case EventTypes.DELETE:
            return `Restore: Bring back ${event.data.merchant || event.data.merchantKey}`;
        case EventTypes.UNMERGE:
            return `Re-merge: Combine items back into ${event.data.displayName || 'merged item'}`;
        default:
            return `Undo ${event.type}`;
    }
}

/**
 * Execute undo for the last undoable event
 * Returns the inverse operations to perform
 * @returns {Object|null} Undo result with events that were undone
 */
export function prepareUndo() {
    const preview = getUndoPreview();
    if (!preview) return null;

    // Get all events to undo (primary + cascading, in reverse chronological order)
    const eventsToUndo = [
        ...preview.cascadingEvents.reverse(), // Undo dependents first
        preview.primaryEvent
    ];

    // Generate inverse operations
    const inverseOperations = eventsToUndo.map(event => ({
        eventId: event.id,
        type: event.type,
        inverseDescription: getInverseDescription(event),
        originalData: event.data
    }));

    return {
        eventsToUndo,
        inverseOperations,
        totalCount: eventsToUndo.length
    };
}

/**
 * Mark events as undone after undo is executed
 * @param {string[]} eventIds - Array of event IDs that were undone
 */
export function markEventsAsUndone(eventIds) {
    const undoEventId = `undo_${Date.now()}`;

    eventIds.forEach(eventId => {
        markEventAsUndone(eventId, undoEventId);
    });

    // Log the undo action itself (not undoable)
    logEvent('UNDO', {
        undoneEventIds: eventIds,
        undoEventId
    }, {
        triggeredBy: 'user',
        affectedKeys: [],
        undoable: false
    });

    return undoEventId;
}

