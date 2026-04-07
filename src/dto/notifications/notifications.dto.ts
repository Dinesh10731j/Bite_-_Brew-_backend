import { IsEnum, IsOptional, IsString } from "class-validator";
import { NotificationPriority, NotificationType } from "../../constant/enum.constant";

export class CreateNotificationDTO {
  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;
}
