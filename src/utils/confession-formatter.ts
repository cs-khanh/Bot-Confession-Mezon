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
    const confessionNumber = confession.id.substring(0, 8).toUpperCase();
    
    // Create formatted content with consistent structure
    let formattedParts = [
      `### Confession #${confessionNumber}`,
      '',
      confession.content
    ];

    // Add tags if available - sử dụng ### (heading 3) cho phần tags
    if (confession.tags && Array.isArray(confession.tags) && confession.tags.length > 0) {
      formattedParts.push('');
      formattedParts.push(`##### Tags: ${confession.tags.map(tag => `#${tag}`).join(' ')}`);
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
}