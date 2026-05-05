import { Injectable } from '@nestjs/common';
import { PlanningService } from '../planning/planning.service';

@Injectable()
export class GanttService {
  constructor(private readonly planningService: PlanningService) {}

  /**
   * Retorna dados no formato DHTMLX Gantt: { data: Task[], links: Link[] }
   * Delega ao PlanningService que já serializa no formato correcto.
   * Recebe o publicId do projecto (UUID) e passa-o ao PlanningService.
   */
  async getProjectData(projectPublicId: string) {
    return this.planningService.getProjectData(projectPublicId);
  }
}
