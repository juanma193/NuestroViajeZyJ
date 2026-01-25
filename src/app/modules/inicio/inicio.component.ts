import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { fotosInicio } from './fotos-inicio-list';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [NgFor],
  templateUrl: './inicio.component.html',
})
export class InicioComponent {
  readonly photos = fotosInicio.map((src, index) => ({ src, alt: `Recuerdo ${index + 1}` }));
}
