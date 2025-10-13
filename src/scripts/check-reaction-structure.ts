import { Logger } from '@nestjs/common';
import { MezonClient, Events } from 'mezon-sdk';

async function testReaction() {
  const logger = new Logger('ReactionTest');
  
  // Thay thế bằng token thực tế của bạn
  const client = new MezonClient(process.env.MEZON_TOKEN || '');
  
  try {
    await client.login();
    logger.log('Client logged in successfully');
    
    // Đăng ký listener cho tất cả các event MessageReaction
    client.onMessageReaction((msg) => {
      logger.log(`Reaction event received: ${JSON.stringify(msg, null, 2)}`);
      
      // Phân tích cấu trúc
      logger.log(`Message ID: ${msg.message_id}`);
      logger.log(`Raw structure: ${JSON.stringify(msg)}`);
      
      // Phân tích các thuộc tính có thể
      const possibleProps = [
        'action', 'reactions', 'count', 'totalCount', 'emoji', 'name', 'userId', 'user_id', 'data'
      ];
      
      possibleProps.forEach(prop => {
        if ((msg as any)[prop] !== undefined) {
          logger.log(`Property ${prop} exists: ${JSON.stringify((msg as any)[prop])}`);
        }
      });
      
      // Tìm tổng số reaction
      let totalCount = null;
      
      // Kiểm tra cấu trúc 1: count hoặc totalCount
      if ((msg as any).count !== undefined) totalCount = (msg as any).count;
      if ((msg as any).totalCount !== undefined) totalCount = (msg as any).totalCount;
      
      // Kiểm tra cấu trúc 2: reactions object
      if ((msg as any).reactions && typeof (msg as any).reactions === 'object') {
        let total = 0;
        const reactionsObj = (msg as any).reactions;
        
        for (const key in reactionsObj) {
          if (typeof reactionsObj[key] === 'number') {
            total += reactionsObj[key];
          }
        }
        totalCount = total;
      }
      
      logger.log(`Total reactions calculated: ${totalCount}`);
    });
    
    logger.log('Event listener registered. Waiting for reactions...');
    
    // Giữ script chạy
    await new Promise(() => {}); // Đợi mãi mãi
    
  } catch (error) {
    logger.error(`Error: ${error.message}`);
  }
}

testReaction().catch(err => console.error(err));