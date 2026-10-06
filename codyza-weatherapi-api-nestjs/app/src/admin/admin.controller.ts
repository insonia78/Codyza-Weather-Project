import { Controller, Post, UseGuards } from '@nestjs/common';

import { AdminService } from './admin.service.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }
}
