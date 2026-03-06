import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'study-card',
  imports: [],
  templateUrl: './study-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyCardComponent {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) assigned_doctor!: string;
  @Input({ required: true }) studyType!: 'gabinete' | 'laboratorio';
  @Input({ required: true }) orderDate!: string;
}
