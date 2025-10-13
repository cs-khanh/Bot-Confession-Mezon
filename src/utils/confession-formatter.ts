import { Confession } from '@app/entities/confession.entity';

/**
 * Centralized utility for formatting confessions consistently across the application
 */
export class ConfessionFormatter {
  /**
   * Format a confession for display in channels
   * @param confession The confession to format
   * @returns Formatted confession text
   */
  static formatForChannel(confession: Confession): string {
    // Use the confession number instead of ID substring
    
    // Create formatted content with consistent structure matching the example image
    let formattedParts = [
      `### Confession #${confession.confessionNumber}`,
      '',
      '```',
      confession.content,
      '```'
    ];

    // Add tags if available
    if (confession.tags && Array.isArray(confession.tags) && confession.tags.length > 0) {
      formattedParts.push('');
      formattedParts.push(`#### Tags: ${confession.tags.map(tag => `#${tag}`).join(' ')}`);
    }
    
    return formattedParts.join('\n');
  }

  /**
   * Create a message object for sending to channels
   * @param confession The confession to format
   * @param channelId The target channel ID
   * @returns A formatted message object ready to be queued
   */
  static createMessageObject(confession: Confession, channelId: string): any {
    const formattedContent = this.formatForChannel(confession);
    
    return {
      channel_id: channelId,
      msg: {
        t: formattedContent
      },
      attachments: confession.attachments || [],
      confession_id: confession.id // Thêm ID confession để có thể cập nhật messageId sau
    };
  }
  
  /**
   * Format a header message that will be posted before the confession
   * This creates a title/category format similar to the image example
   * @returns Formatted header message
   */
  static formatHeaderMessage(): string {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    
    // Using 📝 emoji for Confession category and date format like in the image example
    // No markdown formatting to match the example image
    return `### Confession - ${formattedDate}`;
  }
  
    /**
     * Create a header message object and confession message object pair
     * The confession will reply to the header message (like in the second image example)
     * @param confession The confession to format
     * @param channelId The target channel ID
     * @returns An array of message objects [headerMessage, confessionMessage]
     */
    static createHeaderAndConfessionMessages(confession: Confession, channelId: string): any[] {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        
        // Create header message first (with category and date)
        const headerMessage = {
          channel_id: channelId,
          msg: {
            t: this.formatHeaderMessage()
          },
          id: `header_msg_${timestamp}_${randomId}`,
          is_header_message: true, // Special flag to identify this as a header message
          confession_id: confession.id, // Link to the confession for tracking
          priority: 1 // Higher priority to ensure it's processed first
        };
        
        // Create confession message that will reply to the header message
        const confessionMessage = {
          channel_id: channelId,
          msg: {
            t: this.formatForChannel(confession)
          },
          attachments: confession.attachments || [],
          confession_id: confession.id,
          is_reply: true, // Flag to indicate this is a reply
          reply_to_header_message: true, // Flag to indicate this should reply to the header message
          header_message_id: headerMessage.id, // Store reference to the header message
          priority: 2, // Lower priority, process after header
          wait_for_header: true // Flag to wait for header message to be sent first
        };
        
        return [headerMessage, confessionMessage];
      }  /**
   * For backward compatibility
   * @deprecated Use createHeaderAndConfessionMessages instead
   */
  static createDateAndConfessionMessages(confession: Confession, channelId: string): any[] {
    return this.createHeaderAndConfessionMessages(confession, channelId);
  }
}