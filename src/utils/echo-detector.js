/**
 * EchoDetector - Prevents infinite update loops between Slack and Asana
 * 
 * When we update Slack from Asana, Slack fires a file_change event.
 * When we update Asana from Slack, Asana fires a webhook.
 * Without echo detection, these would loop forever.
 * 
 * Strategy: Track recent updates by item ID and source.
 * If we just updated item X from Slack, ignore the Asana webhook for X.
 * If we just updated item X from Asana, ignore the Slack event for X.
 */
class EchoDetector {
  constructor(ttl = 10000) {
    // Map of itemId:source -> timestamp
    this.recentUpdates = new Map();
    
    // Time to live: how long to remember an update (milliseconds)
    this.ttl = ttl; // Default 10 seconds
    
    // Auto-cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5000); // Cleanup every 5 seconds
  }
  
  /**
   * Mark that we just updated an item from a specific source
   * @param {string} itemId - Item ID (Asana GID or Slack item ID)
   * @param {string} source - Source of update ('slack' or 'asana')
   */
  markUpdate(itemId, source) {
    const key = `${itemId}:${source}`;
    const timestamp = Date.now();
    
    this.recentUpdates.set(key, timestamp);
    
    console.log(`🔔 Marked update: ${key} at ${timestamp}`);
    
    // Also clean up old entries while we're here
    this.cleanup();
  }
  
  /**
   * Check if we should ignore an event from a specific source
   * @param {string} itemId - Item ID
   * @param {string} eventSource - Source of the event we received ('slack' or 'asana')
   * @returns {boolean} True if we should ignore this event (it's an echo)
   */
  shouldIgnore(itemId, eventSource) {
    // If event came from Slack, check if we recently updated from Asana
    // If event came from Asana, check if we recently updated from Slack
    const oppositeSource = eventSource === 'slack' ? 'asana' : 'slack';
    const key = `${itemId}:${oppositeSource}`;
    
    const lastUpdate = this.recentUpdates.get(key);
    
    if (!lastUpdate) {
      return false; // No recent update, not an echo
    }
    
    const elapsed = Date.now() - lastUpdate;
    
    if (elapsed < this.ttl) {
      console.log(`⏭️  Echo detected: ${key} (${elapsed}ms ago, ignoring event from ${eventSource})`);
      return true; // Within TTL, this is an echo
    }
    
    return false; // Outside TTL, not an echo
  }
  
  /**
   * Remove old entries that have exceeded TTL
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, timestamp] of this.recentUpdates.entries()) {
      if (now - timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }
    
    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => this.recentUpdates.delete(key));
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired echo entries`);
    }
  }
  
  /**
   * Clear all entries (for testing or reset)
   */
  reset() {
    this.recentUpdates.clear();
    console.log('🔄 Echo detector reset');
  }
  
  /**
   * Stop the cleanup interval (call when shutting down)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = EchoDetector;

