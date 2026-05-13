import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appNonNegativeNumber],[appnonnegativenumber]',
  standalone: true,
})
export class NonNegativeNumberDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Evitar negativos y notación científica en mobile/desktop
    if (event.key === '-' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;
    const raw = input.value;

    // Si el usuario pega algo con '-', lo limpiamos.
    if (raw.includes('-')) {
      input.value = raw.replace(/-/g, '');
    }

    const value = Number(input.value);
    if (Number.isFinite(value) && value < 0) {
      input.value = '0';
    }
  }

  @HostListener('blur')
  onBlur() {
    const input = this.el.nativeElement;
    const value = Number(input.value);
    if (Number.isFinite(value) && value < 0) {
      input.value = '0';
    }
  }
}
