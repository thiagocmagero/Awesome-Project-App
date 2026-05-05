import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { UserLevelsService } from './user-levels.service';
import { CreateUserLevelDto } from './dto/create-user-level.dto';
import { UpdateUserLevelDto } from './dto/update-user-level.dto';

@Controller('user-levels')
@UseGuards(JwtAuthGuard)
export class UserLevelsController {
  constructor(private readonly userLevelsService: UserLevelsService) {}

  @Get()
  findAll() {
    return this.userLevelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.userLevelsService.findOne(publicId);
  }

  @Post()
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  create(@Body() dto: CreateUserLevelDto) {
    return this.userLevelsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  update(@Param('id', ParseUUIDPipe) publicId: string, @Body() dto: UpdateUserLevelDto) {
    return this.userLevelsService.update(publicId, dto);
  }

  @Delete(':id')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  remove(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.userLevelsService.remove(publicId);
  }
}
