import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PresccriptionImpress } from '../../share/components/presccription-impress/presccription-impress';

@Component({
  selector: 'app-testting-page',
  imports: [PresccriptionImpress],
  templateUrl: './testting-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TesttingPage {}
