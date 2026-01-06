import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  @Input() title?: string;
  @Input() message?: string;
  @Input() type: 'success' | 'info' | 'warning' | 'error' = 'info';
  @Output() closed = new EventEmitter<void>();

  get typeClass(): string {
    const classMappings = {
      success: 'bi-check-circle-fill text-white bg-green-500 rounded-full p-1',
      info: 'bi-info-circle-fill text-white bg-blue-500 rounded-full p-1',
      warning: 'bi-exclamation-diamond-fill text-white bg-yellow-500 rounded-full p-1',
      error: 'bi-x-circle-fill text-white bg-red-500 rounded-full p-1',
    };

    return classMappings[this.type] || '';
  }

  close(): void {
    this.closed.emit();
  }
}
