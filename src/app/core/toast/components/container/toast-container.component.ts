import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../toast.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent implements OnDestroy {
  showToast = false;
  toastTitle?: string;
  toastMessage?: string;
  toastType: 'success' | 'info' | 'warning' | 'error' = 'info';
  subscription: Subscription;
  dismissTimeout: number = 5000;
  timeoutId?: number;

  constructor(private readonly toastService: ToastService) {
    this.subscription = this.toastService.getAlert().subscribe((toast) => {
      this.showToast = true;
      this.toastTitle = toast.title;
      this.toastMessage = toast.message;
      this.toastType = toast.type;
      toast.duration = toast.duration ?? this.dismissTimeout;
      if (this.showToast && toast.duration) {
        this.setDismissTimeout(toast.duration);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  closeToast(): void {
    this.showToast = false;
  }

  setDismissTimeout(duration: number): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.closeToast();
    }, duration) as unknown as number;
  }
}
