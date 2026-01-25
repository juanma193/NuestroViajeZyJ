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
  readonly frases = ['Siempre vos', 'Mi lugar seguro', 'Con vos todo', 'Un día a la vez', 'Nosotros 💖'];
  readonly fraseAleatoria = this.frases[Math.floor(Math.random() * this.frases.length)];

  readonly momentos = [
    {
      titulo: 'Nuestro último viaje',
      texto: 'Buenos Aires · Enero 2026',
      src: fotosInicio[0] ?? '',
      alt: 'Nuestro último viaje',
    },
    {
      titulo: 'Recuerdo favorito',
      texto: 'Ese día que no sabíamos que iba a ser tan especial',
      src: fotosInicio[1] ?? fotosInicio[0] ?? '',
      alt: 'Recuerdo favorito',
    },
  ];

  readonly timeline = ['Cuando empezó todo', 'Primer viaje', 'Nuestra etapa favorita', 'Hoy 💖'];

  readonly captions = [
    'Buenos Aires 🌙',
    'Primer viaje juntos',
    'Verano eterno ☀️',
    'Nuestro rincón',
    'Risas infinitas',
    'Atardecer perfecto',
  ];

  readonly photos = fotosInicio.map((src, index) => ({
    src,
    alt: `Recuerdo ${index + 1}`,
    caption: this.captions[index % this.captions.length],
  }));
}
