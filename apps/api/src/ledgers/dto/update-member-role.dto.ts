import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsIn(['admin', 'editor', 'viewer'])
  role!: 'admin' | 'editor' | 'viewer';
}
