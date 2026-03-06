import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyItemOut } from '../../../models/study-item.model';
import { ItemDatePipe } from '../../../pipes/item-date-pipe';

@Component({
  selector: 'study-items-card',
  imports: [CommonModule, ItemDatePipe],
  templateUrl: './study-items-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyItemsCard {
  @Input() studyItem: StudyItemOut | null = null;
  @Input() selected: boolean = false;

  @Output() selectItem = new EventEmitter<StudyItemOut>();

  onClick(): void {
    if (this.studyItem) {
      this.selectItem.emit(this.studyItem);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobado';
      case 'completed':
        return 'Completado';
      default:
        return status;
    }
  }

  getStudyTypeClass(studyType: string): string {
    if (
      studyType === 'laboratory' ||
      studyType === 'laboratorio' ||
      studyType.toLowerCase().includes('laboratorio')
    ) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-blue-100 text-blue-800';
  }
}
