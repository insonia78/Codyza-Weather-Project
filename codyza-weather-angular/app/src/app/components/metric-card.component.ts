import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  template: `
    <article class="metric-card">
      <span>{{ label() }}</span>
      <strong>{{ value() }}</strong>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
