import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type BannerTone = 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-status-banner',
  standalone: true,
  template: `
    <div class="status-banner" [class.status-banner--warning]="tone() === 'warning'" [class.status-banner--danger]="tone() === 'danger'" [class.status-banner--info]="tone() === 'info'">
      {{ message() }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBannerComponent {
  readonly message = input.required<string>();
  readonly tone = input<BannerTone>('info');
}
