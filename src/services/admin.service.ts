import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
    private readonly adminUserIds: string[];

    constructor(private configService: ConfigService) {
        this.adminUserIds = this.configService.get<string[]>('ADMIN_USER_IDS') || [];
    }

    /**
     * Kiểm tra xem một ID người dùng có phải là quản trị viên không
     * @param userId ID của người dùng cần kiểm tra
     * @returns true nếu người dùng là quản trị viên, false nếu không phải
     */
    isAdmin(userId: string): boolean {
        return this.adminUserIds.includes(userId);
    }

    /**
     * Lấy danh sách tất cả các ID quản trị viên
     * @returns Mảng các ID quản trị viên
     */
    getAdminIds(): string[] {
        return [...this.adminUserIds];
    }
}