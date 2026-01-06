import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [NgFor],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent {
  readonly photos = [
    { src: 'assets/foto1.jpeg', alt: 'Recuerdo 1' },
    { src: 'assets/foto2.jpeg', alt: 'Recuerdo 2' },
    { src: 'assets/foto3.jpeg', alt: 'Recuerdo 3' },
    { src: 'assets/foto4.jpeg', alt: 'Recuerdo 4' },
    { src: 'assets/foto5.jpeg', alt: 'Recuerdo 5' },
    { src: 'assets/foto6.jpeg', alt: 'Recuerdo 6' },
    { src: 'assets/foto7.jpeg', alt: 'Recuerdo 7' },
    { src: 'assets/foto8.jpeg', alt: 'Recuerdo 8' },
    { src: 'assets/foto9.jpeg', alt: 'Recuerdo 9' },
    { src: 'assets/foto10.jpeg', alt: 'Recuerdo 10' },
  ] as const;
}
